import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import apiClient from '../utils/apiClient'; // Adjust the import based on your project structure

// Keep utility functions outside component
const formatNumber = (value) => {
  if (!value) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Math.abs(num) >= 1000) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  } else if (Math.abs(num) >= 100) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 1 });
  } else {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
};

const formatTime = (minutes) => {
  if (!minutes) return '0 min';
  const mins = typeof minutes === 'string' ? parseFloat(minutes) : minutes;
  if (mins < 60) {
    return `${Math.round(mins)} min`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = Math.round(mins % 60);
  return `${hours}h ${remainingMins}m`;
};

const EarningsChart = () => {
  const [chartData, setChartData] = useState({
    cumulativeEarnings: [],
    deliveryCount: [],
    cumulativeActiveTime: [],
    cumulativeDashTime: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('all');
  const [viewMode, setViewMode] = useState('earnings');

  const interpolatePoints = useCallback((points, factor = 3) => {
    if (points.length < 2) return points;
    const result = [];
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      result.push(current);
      const startTime = current[0];
      const endTime = next[0];
      const startValue = current[1];
      const endValue = next[1];
      const timeStep = (endTime - startTime) / (factor + 1);
      for (let j = 1; j <= factor; j++) {
        const time = startTime + timeStep * j;
        const progress = j / (factor + 1);
        const value = startValue + (endValue - startValue) * progress;
        result.push([time, value]);
      }
    }
    result.push(points[points.length - 1]);
    return result;
  }, []);

  // Reduce data points if there are too many
  const simplifyDataPoints = useCallback((points, maxPoints = 100) => {
    if (!points || points.length <= maxPoints) return points;
    
    const factor = Math.ceil(points.length / maxPoints);
    return points.filter((_, i) => i % factor === 0);
  }, []);

  const filteredData = useMemo(() => {
    if (timeRange === 'all' || chartData.cumulativeEarnings.length === 0) {
      return chartData;
    }
    const now = new Date().getTime();
    let cutoffTime;
    switch (timeRange) {
      case '7d':
        cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case '90d':
        cutoffTime = now - 90 * 24 * 60 * 60 * 1000;
        break;
      default:
        return chartData;
    }
    return {
      cumulativeEarnings: chartData.cumulativeEarnings.filter(point => point[0] >= cutoffTime),
      deliveryCount: chartData.deliveryCount.filter(point => point[0] >= cutoffTime),
      cumulativeActiveTime: (chartData.cumulativeActiveTime || []).filter(point => point[0] >= cutoffTime),
      cumulativeDashTime: (chartData.cumulativeDashTime || []).filter(point => point[0] >= cutoffTime)
    };
  }, [chartData, timeRange]);

  const seriesData = useMemo(() => {
    if (viewMode === 'earnings') {
      return [
        { name: 'Cumulative Earnings', data: filteredData.cumulativeEarnings },
        { name: 'Total Deliveries', data: filteredData.deliveryCount }
      ];
    } else {
      return [
        { name: 'Active Time (min)', data: filteredData.cumulativeActiveTime },
        { name: 'Dash Time (min)', data: filteredData.cumulativeDashTime }
      ];
    }
  }, [filteredData, viewMode]);

  const chartOptions = useMemo(() => {
    return {
      chart: {
        type: 'area',
        height: 320,
        zoom: { enabled: true },
        toolbar: {
          show: true,
          offsetX: -15,
          offsetY: -35,
          tools: {
            download: true,
            selection: false,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
            customIcons: [
              {
                icon: '<span class="time-selector-all">All</span>',
                index: 3,
                title: 'All Time',
                class: 'time-selector-btn',
                click: function() {
                  setTimeRange('all');
                }
              }
            ]
          },
          export: {
            csv: { filename: 'DoorDash-Earnings-Data' },
            svg: { filename: 'DoorDash-Earnings-Chart' },
            png: { filename: 'DoorDash-Earnings-Chart' }
          },
          autoSelected: 'zoom'
        },
        background: 'transparent',
        fontFamily: 'Inter, system-ui, sans-serif',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          animateGradually: { enabled: true, delay: 150 }
        },
        events: {
          mounted: function(chart) {
            setTimeout(() => {
              const activeClass = 'active-time-range';
              document.querySelectorAll('.time-selector-btn span').forEach(el => {
                el.parentElement.classList.remove(activeClass);
                if ((timeRange === '7d' && el.classList.contains('time-selector-7d')) ||
                    (timeRange === '30d' && el.classList.contains('time-selector-30d')) ||
                    (timeRange === '90d' && el.classList.contains('time-selector-90d')) ||
                    (timeRange === 'all' && el.classList.contains('time-selector-all'))) {
                  el.parentElement.classList.add(activeClass);
                }
              });
            }, 50);
          }
        }
      },
      series: seriesData,
      stroke: {
        curve: 'smooth',
        width: 3,
        lineCap: 'round'
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1,
          stops: [0, 90, 100]
        }
      },
      dataLabels: { enabled: false },
      markers: {
        size: 0,
        hover: { size: 6, sizeOffset: 3 }
      },
      xaxis: {
        type: 'datetime',
        axisBorder: { color: '#374151' },
        axisTicks: { color: '#4B5563' },
        labels: {
          style: {
            colors: '#9CA3AF',
            fontFamily: 'JetBrains Mono, Monaco, monospace'
          }
        }
      },
      yaxis: [
        {
          title: {
            text: viewMode === 'earnings' ? 'Earnings ($)' : 'Time (minutes)',
            style: { color: viewMode === 'earnings' ? '#10B981' : '#3B82F6' }
          },
          min: viewMode === 'time' ? 0 : undefined,
          forceNiceScale: true,
          labels: {
            formatter: (value) => viewMode === 'time' ? formatTime(value) : formatNumber(value)
          }
        },
        {
          opposite: true,
          title: {
            text: viewMode === 'earnings' ? 'Deliveries' : 'Dashboard Time (min)',
            style: { color: viewMode === 'earnings' ? '#F59E0B' : '#8B5CF6' }
          },
          min: viewMode === 'time' ? 0 : undefined,
          forceNiceScale: true,
          seriesName: viewMode === 'time' ? 'Dash Time (min)' : 'Total Deliveries',
          labels: { formatter: (value) => formatNumber(value) }
        }
      ],
      tooltip: {
        theme: 'dark',
        x: { format: 'MMM dd, yyyy' },
        y: viewMode === 'earnings' ? [
          { formatter: (value) => `$${value.toFixed(2)}` },
          { formatter: (value) => `${Math.round(value)} deliveries` }
        ] : [
          { formatter: (value) => formatTime(value) },
          { formatter: (value) => formatTime(value) }
        ],
        style: {
          fontSize: '12px',
          fontFamily: 'JetBrains Mono, Monaco, monospace'
        }
      },
      grid: {
        borderColor: '#374151',
        strokeDashArray: 4,
        yaxis: { lines: { show: true } },
        padding: { top: 0, right: 0, bottom: 0, left: 10 }
      },
      colors: viewMode === 'earnings' ? ['#10B981', '#F59E0B'] : ['#3B82F6', '#8B5CF6'],
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        labels: { colors: '#D1D5DB' }
      }
    };
  }, [viewMode, seriesData]);

  // Get current total earnings based on filtered data
  const currentTotalEarnings = useMemo(() => {
    // Get base earnings from chart data
    let baseEarnings = 0;
    if (filteredData.cumulativeEarnings?.length > 0) {
      baseEarnings = filteredData.cumulativeEarnings[filteredData.cumulativeEarnings.length - 1][1];
    }
    
    // Always add $50 challenge bonus
    const challengeBonus = 50;
    
    // Store the bonus in chartData for reference elsewhere
    if (!chartData.challengeBonusTotal) {
      setChartData(prev => ({
        ...prev,
        challengeBonusTotal: challengeBonus
      }));
    }
    
    // Return the combined total
    return baseEarnings + challengeBonus;
  }, [filteredData, chartData, setChartData]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await apiClient.get('/api/timeseries');
        
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // Handle the case where data is an object with arrays instead of an array of objects
        if (!data) {
          setError("No data available");
          setLoading(false);
          return;
        }
        
        // Check if we have the expected format (matching your API response)
        if (data.labels && Array.isArray(data.labels)) {
          // Process object format with labels and data arrays
          const processedData = {
            runningEarnings: 0,
            runningDeliveries: 0,
            runningActiveTime: 0,
            runningDashTime: 0,
            earnings: [],
            deliveries: [],
            activeTime: [],
            dashTime: []
          };
          
          // Process the paired arrays
          data.labels.forEach((dateStr, index) => {
            const timestamp = new Date(dateStr).getTime();
            const earnings = data.earnings[index] || 0;
            const deliveries = data.deliveries[index] || 0;
            const activeTime = data.active_time && data.active_time[index] ? data.active_time[index] : 0;
            const dashTime = data.dash_time && data.dash_time[index] ? data.dash_time[index] : 0;
            
            processedData.runningEarnings += earnings;
            processedData.runningDeliveries += deliveries;
            processedData.runningActiveTime += activeTime;
            processedData.runningDashTime += dashTime;
            
            processedData.earnings.push([timestamp, processedData.runningEarnings]);
            processedData.deliveries.push([timestamp, processedData.runningDeliveries]);
            processedData.activeTime.push([timestamp, processedData.runningActiveTime]);
            processedData.dashTime.push([timestamp, processedData.runningDashTime]);
          });
          
          setChartData({
            cumulativeEarnings: simplifyDataPoints(processedData.earnings),
            deliveryCount: simplifyDataPoints(processedData.deliveries),
            cumulativeActiveTime: simplifyDataPoints(processedData.activeTime),
            cumulativeDashTime: simplifyDataPoints(processedData.dashTime)
          });
        } else {
          setError("Unexpected data format from API");
        }
      } catch (err) {
        setError(err.message);
        console.error('Chart error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [interpolatePoints, simplifyDataPoints]);

  const ViewModeSelector = () => (
    <div className="flex items-center mb-4">
      <div className="font-mono text-sm text-gray-400 mr-3">View Mode:</div>
      <div className="flex space-x-2">
        <button
          onClick={() => setViewMode('earnings')}
          className={`px-3 py-1 rounded-md text-xs font-medium ${
            viewMode === 'earnings'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Earnings & Deliveries
        </button>
        <button
          onClick={() => setViewMode('time')}
          className={`px-3 py-1 rounded-md text-xs font-medium ${
            viewMode === 'time'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Active & Dash Time
        </button>
      </div>
    </div>
  );

  if (loading)
    return (
      <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 mb-8 border border-gray-700/50 shadow-xl">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-80 bg-gray-700/50 rounded"></div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 mb-8 border border-gray-700/50 shadow-xl">
        <div className="text-red-500 font-mono">Error loading chart: {error}</div>
      </div>
    );

  return (
    <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 mb-8 border border-gray-700/50 shadow-xl">
      {/* Chart header with correct earnings */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-mono text-xl text-gray-300">
            Earnings & Deliveries
          </h2>
          
          <div className="mt-1">
            <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
              ${currentTotalEarnings.toFixed(2)}
            </span>
            <span className="text-sm text-gray-400 ml-2">
              {timeRange === 'all' ? 'All Time' : timeRange === '7d' ? '7 Days' : 
               timeRange === '30d' ? '30 Days' : '90 Days'}
            </span>
          </div>
        </div>
        
        {/* Legend/controls */}
        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'earnings' ? (
            <>
              <span className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                Total Earnings
              </span>
              <span className="inline-block bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                Total Deliveries
              </span>
            </>
          ) : (
            <>
              <span className="inline-block bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                Active Time
              </span>
              <span className="inline-block bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                Dash Time
              </span>
            </>
          )}
        </div>
      </div>
      
      <ViewModeSelector />

      <div className="w-full h-80">
        <ReactApexChart
          options={chartOptions}
          series={chartOptions.series}
          type="area"
          height="100%"
        />
      </div>
      
      <style jsx>{`
        :global(.apexcharts-toolbar) {
          padding: 0 !important;
          top: 102px !important;
          right: auto !important;
          left: 10px !important;
        }
        
        :global(.apexcharts-menu) {
          background: #1F2937 !important;
          border: 1px solid #374151 !important;
        }
        
        :global(.apexcharts-menu-item) {
          color: #D1D5DB !important;
        }
        
        :global(.time-selector-btn) {
          background: rgba(75, 85, 99, 0.3) !important;
          border-radius: 6px !important;
          margin-right: 4px !important;
          padding: 4px 8px !important;
          color: #9CA3AF !important;
          font-family: 'JetBrains Mono', Monaco, Consolas, monospace !important;
          font-size: 11px !important;
          width: auto !important;
          height: auto !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          transform: translateX(0) !important;
        }
        
        :global(.time-selector-btn.active-time-range) {
          background: #3B82F6 !important;
          color: white !important;
        }
        
        :global(.time-selector-btn:hover) {
          background: rgba(75, 85, 99, 0.5) !important;
        }
        
        :global(.time-selector-btn.active-time-range:hover) {
          background: #2563EB !important;
        }
        
        :global(.apexcharts-toolbar-tools-download) {
          margin-right: 8px !important;
        }
        
        :global(.apexcharts-toolbar-custom-icon) {
          margin: 0 2px !important;
        }
        
        :global(.apexcharts-menu-icon) {
          margin-right: 5px !important;
        }
        
        :global(.apexcharts-legend) {
          margin-bottom: 25px !important;
        }
      `}</style>
    </div>
  );
};

export default React.memo(EarningsChart);