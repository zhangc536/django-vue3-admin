<template>
  <div class="home-container">
    <el-row :gutter="12" class="mb-2">
      <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-title">客户总数</div>
            <div class="stat-value">{{ metrics.totalCustomers }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-title">设备总数</div>
            <div class="stat-value">{{ metrics.totalDevices }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-title">今日装机数量</div>
            <div class="stat-value">{{ metrics.todayDevices }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-title">今日收款金额</div>
            <div class="stat-value">{{ formatCurrency(metrics.todayIncome) }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" class="mb-2">
      <el-col :xs="24" :sm="24" :md="14" :lg="14" :xl="14">
        <el-card :body-style="{ height: '360px', padding: '8px' }" shadow="hover">
          <div class="chart-title">
            <span>收款金额与客户数量</span>
            <el-radio-group v-model="period" size="small" class="chart-toggle">
              <el-radio-button label="year">年</el-radio-button>
              <el-radio-button label="month">月</el-radio-button>
              <el-radio-button label="day">日</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="barRef" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="24" :md="10" :lg="10" :xl="10">
        <el-card :body-style="{ height: '360px', padding: '8px' }" shadow="hover">
          <div class="chart-title">
            <span>合并客户数量</span>
            <el-radio-group v-model="linePeriod" size="small" class="chart-toggle">
              <el-radio-button label="year">年</el-radio-button>
              <el-radio-button label="month">月</el-radio-button>
              <el-radio-button label="day">日</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="lineRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12">
      <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
        <el-card shadow="hover">
          <div class="table-title">待缴费客户</div>
          <el-table :data="needPayTable" size="small" style="width: 100%;" v-loading="loading">
            <el-table-column prop="name" label="客户" min-width="140" />
            <el-table-column prop="device" label="设备数" width="90" />
            <el-table-column prop="amount" label="金额" width="110" />
            <el-table-column prop="uploader" label="上传人" width="120" />
            <el-table-column prop="is_need_pay" label="需缴费" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.is_need_pay ? 'danger' : 'success'">
                  {{ scope.row.is_need_pay ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="date" label="日期" min-width="120" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
  
</template>

<script lang="ts" setup name="home">
import { ref, reactive, onMounted, nextTick, onBeforeUnmount, watch } from 'vue';
import { request } from '/@/utils/service';
import * as echarts from 'echarts';
import { init, ECharts, EChartsOption } from 'echarts';

type CustomerItem = {
  id: number;
  name: string;
  device?: number;
  amount?: number;
  is_need_pay?: boolean;
  is_paid?: boolean;
  uploader?: string;
  date?: string;
};

type FinanceItem = {
  customer_name: string;
  amount: number;
  income: number;
};

  const metrics = reactive({
    totalCustomers: 0,
    totalDevices: 0,
    needPayCount: 0,
    todayIncome: 0,
    todayDevices: 0,
    paidCount: 0,
    totalIncome: 0,
    totalCost: 0,
  });

const loading = ref(false);
const needPayTable = ref<CustomerItem[]>([]);

const barRef = ref<HTMLElement | null>(null);
const lineRef = ref<HTMLElement | null>(null);
let barChart: ECharts | null = null;
let lineChart: ECharts | null = null;
let refreshTimer: any = null;
const refreshing = ref(false);
const REFRESH_MS = 10000;
const period = ref<'year' | 'month' | 'day'>('month');
let customersCache: CustomerItem[] = [];
const linePeriod = ref<'year' | 'month' | 'day'>('month');

  const sum = (arr: number[]) => arr.reduce((a, b) => a + (isFinite(b) ? b : 0), 0);

  const parseNum = (v: any) => {
    const n = Number(v);
    return isFinite(n) ? n : 0;
  };
  const formatCurrency = (v: number) => Number(v || 0).toFixed(2);
  const normalizeName = (raw: any) => {
    const s = String(raw ?? '');
    const cleaned = s.replace(/\u3000+/g, ' ').trim();
    return cleaned || s;
  };

const buildMonths = () => {
  const labels: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return labels;
};

const renderPeriodChart = (customers: CustomerItem[]) => {
  if (!barChart && barRef.value) {
    barChart = init(barRef.value);
  }
  if (!barChart) return;
  const now = new Date();
  let labels: string[] = [];
  if (period.value === 'day') {
    const y = now.getFullYear();
    const m = now.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    labels = Array.from({ length: days }, (_, i) => String(i + 1).padStart(2, '0'));
  } else if (period.value === 'month') {
    labels = buildMonths();
  } else {
    const y = now.getFullYear();
    labels = Array.from({ length: 5 }, (_, i) => String(y - (4 - i)));
  }
  const amountSeries = labels.map((lab) => {
    return sum(
      customers
        .filter((c) => {
          const ds = String(c.date || '');
          if (period.value === 'day') {
            const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            return ds.startsWith(ym) && ds.slice(8, 10) === lab;
          }
          if (period.value === 'month') return ds.slice(0, 7) === lab;
          return ds.slice(0, 4) === lab;
        })
        .map((c) => parseNum(c.amount))
    );
  });
  const deviceSeries = labels.map((lab) => {
    return sum(
      customers
        .filter((c) => {
          const ds = String(c.date || '');
          if (period.value === 'day') {
            const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            return ds.startsWith(ym) && ds.slice(8, 10) === lab;
          }
          if (period.value === 'month') return ds.slice(0, 7) === lab;
          return ds.slice(0, 4) === lab;
        })
        .map((c) => parseNum(c.device))
    );
  });
  const option: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['收款金额', '设备数量'] },
    grid: { top: '16%', right: '5%', bottom: '12%', left: '10%' },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value' },
    series: [
      {
        name: '收款金额',
        type: 'bar',
        data: amountSeries,
        barWidth: '40%',
        itemStyle: { color: '#67C23A' },
      },
      {
        name: '设备数量',
        type: 'bar',
        data: deviceSeries,
        barWidth: '40%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#83bff6' },
            { offset: 1, color: '#188df0' },
          ]),
        },
      },
    ],
  };
  barChart.setOption(option);
};

const renderLineChart = (customers: CustomerItem[]) => {
  if (!lineChart && lineRef.value) {
    lineChart = init(lineRef.value);
  }
  if (!lineChart) return;
  const now = new Date();
  let labels: string[] = [];
  if (linePeriod.value === 'day') {
    const y = now.getFullYear();
    const m = now.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    labels = Array.from({ length: days }, (_, i) => String(i + 1).padStart(2, '0'));
  } else if (linePeriod.value === 'month') {
    labels = buildMonths();
  } else {
    const y = now.getFullYear();
    labels = Array.from({ length: 5 }, (_, i) => String(y - (4 - i)));
  }
  const counts = labels.map((lab) => {
    const set = new Set<string>();
    customers.forEach((c) => {
      const ds = String(c.date || '');
      if (linePeriod.value === 'day') {
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (ds.startsWith(ym) && ds.slice(8, 10) === lab) set.add(normalizeName(c.name));
      } else if (linePeriod.value === 'month') {
        if (ds.slice(0, 7) === lab) set.add(normalizeName(c.name));
      } else {
        if (ds.slice(0, 4) === lab) set.add(normalizeName(c.name));
      }
    });
    return set.size;
  });
  const option: EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { top: '16%', right: '5%', bottom: '12%', left: '10%' },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value' },
    series: [
      {
        name: '合并客户数',
        type: 'line',
        smooth: true,
        areaStyle: {},
        data: counts,
        itemStyle: { color: '#409EFF' },
      },
    ],
  };
  lineChart.setOption(option);
};

const refreshCharts = () => {
  barChart && barChart.resize();
  lineChart && lineChart.resize();
};

const loadDashboardData = async () => {
  if (refreshing.value) return;
  refreshing.value = true;
  if (!barChart || !lineChart) loading.value = true;
  try {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const [customerRes, todayRes, financeRes] = await Promise.all([
      request({ url: '/api/system/customer/', method: 'get', params: { limit: 9999 } }),
      request({ url: '/api/system/customer/', method: 'get', params: { start_date: todayStr, end_date: todayStr, limit: 9999 } }),
      request({ url: '/api/system/finance/', method: 'get', params: {} }),
    ]);
    const customers: CustomerItem[] = (customerRes?.data as any[]) || [];
    customersCache = customers;
    const todayCustomers: CustomerItem[] = (todayRes?.data as any[]) || [];
    const financeItems: FinanceItem[] = (financeRes?.data as any[]) || [];

    const normalizeName = (raw: any) => {
      const s = String(raw ?? '');
      const cleaned = s.replace(/\u3000+/g, ' ').trim();
      return cleaned || s;
    };
    const mergedNames = new Set(customers.map((c) => normalizeName(c.name))).size;
    metrics.totalCustomers = mergedNames;
    metrics.totalDevices = sum(customers.map((c) => parseNum(c.device)));
    metrics.needPayCount = customers.filter((c) => !!c.is_need_pay).length;
    metrics.paidCount = customers.filter((c) => !!c.is_paid).length;
    metrics.totalIncome = sum(financeItems.map((i) => parseNum(i.income)));
    metrics.totalCost = sum(financeItems.map((i) => parseNum(i.amount)));

    metrics.todayDevices = sum(todayCustomers.map((c) => parseNum(c.device)));
    metrics.todayIncome = sum(todayCustomers.map((c) => parseNum(c.amount)));

    needPayTable.value = customers
      .filter((c) => !!c.is_need_pay)
      .sort((a, b) => parseNum(b.amount) - parseNum(a.amount))
      .slice(0, 8);

    renderPeriodChart(customers);
    renderLineChart(customers);
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
};

onMounted(async () => {
  await nextTick();
  if (barRef.value) barChart = init(barRef.value);
  if (lineRef.value) lineChart = init(lineRef.value);
  await loadDashboardData();
  window.addEventListener('resize', refreshCharts);
  refreshTimer = setInterval(loadDashboardData, REFRESH_MS);
  const onVis = () => {
    if (document.hidden) {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
    } else {
      if (!refreshTimer) refreshTimer = setInterval(loadDashboardData, REFRESH_MS);
    }
  };
  document.addEventListener('visibilitychange', onVis);
  (window as any).__home_onVis = onVis;
});

watch(period, () => {
  renderPeriodChart(customersCache);
});
watch(linePeriod, () => {
  renderLineChart(customersCache);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', refreshCharts);
  barChart && barChart.dispose();
  lineChart && lineChart.dispose();
  if (refreshTimer) clearInterval(refreshTimer);
  const fn = (window as any).__home_onVis;
  if (fn) document.removeEventListener('visibilitychange', fn);
});
</script>

<style scoped lang="scss">
.home-container {
  padding: 12px;
  box-sizing: border-box;
}
.mb-2 {
  margin-bottom: 12px;
}
.stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stat-title {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}
.stat-value {
  font-size: 24px;
  font-weight: 600;
}
.chart {
  width: 100%;
  height: 320px;
}
.chart-title, .table-title {
  font-size: 14px;
  margin-bottom: 6px;
  color: var(--el-text-color-secondary);
}
.chart-title { display: flex; align-items: center; justify-content: space-between; }
.chart-toggle { display: inline-flex; }
</style>
