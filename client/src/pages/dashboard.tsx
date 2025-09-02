import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  DollarSign, Clock, Users, ArrowDownCircle, AlertTriangle, 
  ChartLine, FolderSync, Download, ChevronUp, ChevronDown, Database,
  Phone, TrendingUp, CheckCircle, Calendar, ArrowUp, ArrowDown,
  UserCheck, MessageCircle, FileText, AlertCircle, Brain, Zap, 
  Target, Bell, Activity, BarChart3, UserPlus, TrendingDown,
  Lightbulb, Search, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

export default function Dashboard() {
  // State to hold parsed data
  const [data, setData] = useState({
    udDollarWeekly: [] as any[],
    talkTimeDaily: [] as any[],
    conversionDaily: [] as any[],
    leadsGrabbedDaily: [] as any[],
    leadsBehindSummary: [] as any[],
    conversionRepMonthly: [] as any[],
    conversionRepDaily: [] as any[],
  });

  // State for loading and URLs
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configCollapsed, setConfigCollapsed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [repTargets, setRepTargets] = useState<{[key: string]: {conversions: number, talkTime: number, uploads: number}}>({});
  
  const [baseSheetUrl, setBaseSheetUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vRItUGpVy9ifoEA9hKEUyJvfdcCQ5UuFmDchpDiZ-gV9zR6gIr7uYZ1lvTWfPvpaxI3Z7TzzywTqypS/pub?');
  const [gids, setGids] = useState({
    udDollarWeekly: '1498781890', 
    talkTimeDaily: '1050305791', 
    conversionDaily: '653460525', 
    leadsGrabbedDaily: '1664565885', 
    leadsBehindSummary: '477962305', 
    conversionRepMonthly: '2121407859',
    conversionRepDaily: '918041095',
  });

  const handleGidChange = (key: string, value: string) => {
    setGids(prevGids => ({ ...prevGids, [key]: value }));
  };

  // Helper function to parse and format data from a URL
  const parseDataFromUrl = (url: string, formatter: (data: any[]) => any[]) => {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error("CSV Parsing Errors:", results.errors);
            reject(results.errors);
          } else {
            resolve(formatter(results.data));
          }
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  };

  // Helper function to format MTD Dollars
  const formatMtdDollars = (value: any) => {
    if (typeof value === 'string') {
      return parseFloat(value.replace(/[$,]/g, ''));
    }
    return value;
  };

  // Helper function to get yesterday's data
  const getYesterdayData = (dataArray: any[], dateField: string = 'Date') => {
    if (dataArray.length < 2) return null;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    return dataArray.find(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate.toISOString().split('T')[0] === yesterdayStr;
    });
  };

  // Helper function to get today's data
  const getTodayData = (dataArray: any[], dateField: string = 'Date') => {
    if (dataArray.length === 0) return null;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    return dataArray.find(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate.toISOString().split('T')[0] === todayStr;
    }) || dataArray[dataArray.length - 1]; // fallback to latest data
  };

  // Helper function to calculate cohort-based conversion rates
  const calculateCohortConversions = () => {
    const cohortData: any = {};
    
    // Process leads grabbed by date and rep
    data.leadsGrabbedDaily.forEach(item => {
      const date = item.Date;
      const leadsGrabbed = item['Leads Grabbed'] || 0;
      
      if (!cohortData[date]) {
        cohortData[date] = { leadsGrabbed: 0, conversions: 0, reps: {} };
      }
      cohortData[date].leadsGrabbed += leadsGrabbed;
    });
    
    // Process conversions by date and rep from new daily data
    data.conversionRepDaily.forEach(item => {
      const leadDate = item.Date; // Lead created date
      const conversionDate = item.ConversionDate;
      const rep = item.Rep;
      
      // Only count same-day conversions for cohort analysis
      if (leadDate === conversionDate) {
        if (!cohortData[leadDate]) {
          cohortData[leadDate] = { leadsGrabbed: 0, conversions: 0, reps: {} };
        }
        cohortData[leadDate].conversions += 1;
        
        if (!cohortData[leadDate].reps[rep]) {
          cohortData[leadDate].reps[rep] = { conversions: 0, leadsGrabbed: 0 };
        }
        cohortData[leadDate].reps[rep].conversions += 1;
      }
    });
    
    return cohortData;
  };

  // Helper function to calculate rep performance with team averages
  const calculateRepPerformance = () => {
    const repStats: any = {};
    const cohortData = calculateCohortConversions();
    
    // Process conversion data by rep from monthly data
    data.conversionRepMonthly.forEach(rep => {
      const repName = rep['Rep Name'];
      if (!repStats[repName]) {
        repStats[repName] = {
          name: repName,
          conversions: 0,
          conversionDollars: 0,
          uploads: 0,
          talkTime: 0,
          cohortConversionRate: 0
        };
      }
      repStats[repName].conversions = rep['MTD Units'] || 0;
      repStats[repName].conversionDollars = rep['MTD Dollars'] || 0;
    });

    // Calculate cohort-based conversion rates for each rep
    Object.keys(repStats).forEach(repName => {
      let totalLeads = 0;
      let totalConversions = 0;
      
      Object.values(cohortData).forEach((dayData: any) => {
        if (dayData.reps[repName]) {
          totalConversions += dayData.reps[repName].conversions;
          // Estimate leads grabbed based on proportion (this could be improved with actual rep-level lead data)
          const repProportion = dayData.reps[repName].conversions / (dayData.conversions || 1);
          totalLeads += dayData.leadsGrabbed * repProportion;
        }
      });
      
      repStats[repName].cohortConversionRate = totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0;
    });

    // Calculate team averages
    const reps = Object.values(repStats);
    const teamAverage = {
      conversions: reps.reduce((sum: number, rep: any) => sum + rep.conversions, 0) / reps.length,
      conversionDollars: reps.reduce((sum: number, rep: any) => sum + rep.conversionDollars, 0) / reps.length,
      uploads: reps.reduce((sum: number, rep: any) => sum + rep.uploads, 0) / reps.length,
      talkTime: reps.reduce((sum: number, rep: any) => sum + rep.talkTime, 0) / reps.length,
      cohortConversionRate: reps.reduce((sum: number, rep: any) => sum + rep.cohortConversionRate, 0) / reps.length
    };

    // Add performance flags and percentages
    Object.values(repStats).forEach((rep: any) => {
      rep.conversionPerformance = teamAverage.conversions > 0 ? (rep.conversions / teamAverage.conversions) * 100 : 0;
      rep.uploadsPerformance = teamAverage.uploads > 0 ? (rep.uploads / teamAverage.uploads) * 100 : 0;
      rep.talkTimePerformance = teamAverage.talkTime > 0 ? (rep.talkTime / teamAverage.talkTime) * 100 : 0;
      
      // Flag underperformers (below 50% of team average)
      rep.isUnderperforming = rep.conversionPerformance < 50 || rep.cohortConversionRate < 50;
    });

    return { repStats: Object.values(repStats), teamAverage };
  };

  // Advanced Analytics Functions
  const detectAnomalies = () => {
    const anomalies: any[] = [];
    
    // Check for unusual patterns in talk time
    if (data.talkTimeDaily.length > 7) {
      const recent = data.talkTimeDaily.slice(-7);
      const avgMinutes = recent.reduce((sum, day) => sum + parseFloat(day['Total Minutes'] || '0'), 0) / 7;
      const todayMinutes = parseFloat(getTodayData(data.talkTimeDaily, 'Date')?.['Total Minutes'] || '0');
      
      if (todayMinutes < avgMinutes * 0.5) {
        anomalies.push({
          type: 'Low Talk Time',
          severity: 'high',
          message: `Today's talk time (${todayMinutes} min) is 50% below 7-day average (${avgMinutes.toFixed(1)} min)`,
          icon: TrendingDown,
          color: 'destructive'
        });
      }
    }

    // Check for conversion rate drops
    if (data.conversionDaily.length > 7) {
      const recent = data.conversionDaily.slice(-7);
      const avgConversions = recent.reduce((sum, day) => sum + (day['count Loan Value'] || 0), 0) / 7;
      const todayConversions = getTodayData(data.conversionDaily, 'Date')?.['count Loan Value'] || 0;
      
      if (todayConversions < avgConversions * 0.3) {
        anomalies.push({
          type: 'Low Conversions',
          severity: 'high',
          message: `Today's conversions (${todayConversions}) are 70% below 7-day average (${avgConversions.toFixed(1)})`,
          icon: AlertTriangle,
          color: 'destructive'
        });
      }
    }

    return anomalies;
  };

  const generatePerformanceInsights = () => {
    const insights: any[] = [];
    const { repStats } = calculateRepPerformance();
    
    // Best performer insight
    if (repStats.length > 0) {
      const topPerformer = repStats.reduce((best: any, current: any) => 
        (current.conversionPerformance > best.conversionPerformance) ? current : best, repStats[0]);
      
      if (topPerformer && topPerformer.name) {
        insights.push({
          type: 'Top Performer',
          message: `${topPerformer.name} is leading with ${topPerformer.cohortConversionRate?.toFixed(1) || 0}% conversion rate`,
          action: 'Consider having them mentor underperformers',
          icon: TrendingUp,
          color: 'success'
        });
      }
    }

    // Talk time vs conversion correlation
    const talkTimeToday = parseFloat(getTodayData(data.talkTimeDaily, 'Date')?.['Total Minutes'] || '0');
    const conversionsToday = getTodayData(data.conversionDaily, 'Date')?.['count Loan Value'] || 0;
    
    if (talkTimeToday > 0 && conversionsToday === 0) {
      insights.push({
        type: 'Conversion Opportunity',
        message: `High talk time (${talkTimeToday} min) but no conversions today`,
        action: 'Review call quality and closing techniques',
        icon: Search,
        color: 'accent'
      });
    }

    return insights;
  };

  const calculateTrendForecast = () => {
    if (data.conversionDaily.length < 7) return null;
    
    const recent7Days = data.conversionDaily.slice(-7);
    const dailyAverage = recent7Days.reduce((sum, day) => sum + (day['count Loan Value'] || 0), 0) / 7;
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - new Date().getDate();
    
    return {
      projectedMonthlyConversions: Math.round(dailyAverage * daysInMonth),
      projectedAdditional: Math.round(dailyAverage * daysRemaining),
      dailyAverage: dailyAverage.toFixed(1),
      confidence: recent7Days.length >= 7 ? 'high' : 'medium'
    };
  };

  const calculateStaffingNeeds = () => {
    const totalLeadsToday = getTodayData(data.leadsGrabbedDaily, 'Date')?.['Leads Grabbed'] || 0;
    const totalConversionsToday = getTodayData(data.conversionDaily, 'Date')?.['count Loan Value'] || 0;
    const totalTalkTimeToday = parseFloat(getTodayData(data.talkTimeDaily, 'Date')?.['Total Minutes'] || '0');
    
    const conversionRate = totalLeadsToday > 0 ? (totalConversionsToday / totalLeadsToday) * 100 : 0;
    const avgCallDuration = totalConversionsToday > 0 ? totalTalkTimeToday / totalConversionsToday : 0;
    
    // Simple staffing calculation
    const optimalConversionRate = 15; // Target 15% conversion rate
    const targetCallsPerRep = 50; // Target calls per rep per day
    
    const currentEfficiency = conversionRate / optimalConversionRate;
    const recommendedStaff = Math.ceil(totalLeadsToday / (targetCallsPerRep * Math.max(currentEfficiency, 0.5)));
    
    return {
      currentStaff: data.conversionRepMonthly.length,
      recommendedStaff,
      conversionRate: conversionRate.toFixed(1),
      avgCallDuration: avgCallDuration.toFixed(1),
      efficiency: (currentEfficiency * 100).toFixed(0)
    };
  };

  const generateCoachingInsights = () => {
    const { repStats, teamAverage } = calculateRepPerformance();
    const coachingNeeds: any[] = [];
    
    repStats.forEach((rep: any) => {
      const needs: string[] = [];
      
      if (rep.conversionPerformance < 70) {
        needs.push('Conversion techniques');
      }
      if (rep.talkTimePerformance < 70) {
        needs.push('Call engagement');
      }
      if (rep.uploadsPerformance < 70) {
        needs.push('Documentation process');
      }
      
      if (needs.length > 0) {
        coachingNeeds.push({
          rep: rep.name,
          priority: rep.conversionPerformance < 50 ? 'high' : 'medium',
          areas: needs,
          performance: rep.conversionPerformance.toFixed(0)
        });
      }
    });
    
    return coachingNeeds.sort((a, b) => 
      (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1)
    );
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const newData = {
        udDollarWeekly: [] as any[],
        talkTimeDaily: [] as any[],
        conversionDaily: [] as any[],
        leadsGrabbedDaily: [] as any[],
        leadsBehindSummary: [] as any[],
        conversionRepMonthly: [] as any[],
        conversionRepDaily: [] as any[],
      };

      // Construct and fetch for each dataset
      const udDollarWeeklyUrl = `${baseSheetUrl}gid=${gids.udDollarWeekly}&single=true&output=csv`;
      newData.udDollarWeekly = await parseDataFromUrl(udDollarWeeklyUrl, (docs: any[]) => docs) as any[];
      
      const talkTimeDailyUrl = `${baseSheetUrl}gid=${gids.talkTimeDaily}&single=true&output=csv`;
      newData.talkTimeDaily = await parseDataFromUrl(talkTimeDailyUrl, (docs: any[]) => docs.map(d => ({
        ...d,
        "Total Minutes": d['sum Duration'] ? parseFloat(d['sum Duration']).toFixed(2) : 0,
        Date: d['Created Date'],
      })).sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())) as any[];

      const conversionDailyUrl = `${baseSheetUrl}gid=${gids.conversionDaily}&single=true&output=csv`;
      newData.conversionDaily = await parseDataFromUrl(conversionDailyUrl, (docs: any[]) => docs.map(d => ({
        ...d,
        "Total Dollars": d['sum Loan Value'],
        Date: d['Created Date'],
      })).sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())) as any[];

      const leadsGrabbedDailyUrl = `${baseSheetUrl}gid=${gids.leadsGrabbedDaily}&single=true&output=csv`;
      newData.leadsGrabbedDaily = await parseDataFromUrl(leadsGrabbedDailyUrl, (docs: any[]) => docs.map(d => ({
        ...d,
        Date: d.Date,
      })).sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())) as any[];

      const leadsBehindSummaryUrl = `${baseSheetUrl}gid=${gids.leadsBehindSummary}&single=true&output=csv`;
      newData.leadsBehindSummary = await parseDataFromUrl(leadsBehindSummaryUrl, (docs: any[]) => docs.sort((a, b) => b.Total - a.Total)) as any[];

      const conversionRepMonthlyUrl = `${baseSheetUrl}gid=${gids.conversionRepMonthly}&single=true&output=csv`;
      newData.conversionRepMonthly = await parseDataFromUrl(conversionRepMonthlyUrl, (docs: any[]) => docs.map(d => ({
        ...d,
        "MTD Dollars": formatMtdDollars(d["MTD Dollars"]),
      })).sort((a, b) => b["MTD Dollars"] - a["MTD Dollars"])) as any[];

      const conversionRepDailyUrl = `${baseSheetUrl}gid=${gids.conversionRepDaily}&single=true&output=csv`;
      newData.conversionRepDaily = await parseDataFromUrl(conversionRepDailyUrl, (docs: any[]) => docs.map(d => ({
        ...d,
        Date: d['Lead Created Date'] || d['Date'],
        Rep: d['Rep Name'] || d['Rep'],
        ConversionDate: d['Conversion Date'] || d['Date'],
      })).sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())) as any[];
      
      setData(newData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load data. Please ensure the base URL and GIDs are correct and the sheets are published to the web as CSV.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [baseSheetUrl, gids]);

  // Auto-refresh effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchAllData();
      }, 30000); // 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, baseSheetUrl, gids]);

  // Notification system
  useEffect(() => {
    if (data.conversionRepMonthly.length > 0) {
      const anomalies = detectAnomalies();
      const { repStats } = calculateRepPerformance();
      const underperformers = repStats.filter((rep: any) => rep.isUnderperforming);
      
      const newNotifications: any[] = [];
      
      // Add anomaly notifications
      anomalies.forEach(anomaly => {
        newNotifications.push({
          id: `anomaly-${anomaly.type}`,
          type: 'alert',
          severity: anomaly.severity,
          message: anomaly.message,
          timestamp: new Date(),
          read: false
        });
      });
      
      // Add underperformer notifications
      underperformers.forEach((rep: any) => {
        newNotifications.push({
          id: `underperform-${rep.name}`,
          type: 'warning',
          severity: 'medium',
          message: `${rep.name} is performing below 50% of team average`,
          timestamp: new Date(),
          read: false
        });
      });
      
      setNotifications(newNotifications);
    }
  }, [data]);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return date.toLocaleDateString();
  };

  const exportData = () => {
    const csv = Papa.unparse(data.conversionRepMonthly);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales-dashboard-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <ChartLine className="text-primary text-2xl" size={24} />
                <h1 className="text-xl font-semibold text-foreground">Sales Dashboard</h1>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-success rounded-full pulse-dot"></div>
                <span>Live Data</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                Last updated: <span>{formatLastUpdated(lastUpdated)}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchAllData}
                disabled={loading}
                data-testid="button-refresh"
              >
                <FolderSync className={`mr-2 h-4 w-4 ${loading ? 'loading-spinner' : ''}`} />
                Refresh
              </Button>
              <Button 
                size="sm"
                onClick={exportData}
                data-testid="button-export"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Configuration Panel */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Data Source Configuration</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your Google Sheets to start displaying real-time data
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfigCollapsed(!configCollapsed)}
                data-testid="button-toggle-config"
              >
                {configCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {!configCollapsed && (
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="baseSheetUrl">Base Google Sheets URL</Label>
                <Input
                  id="baseSheetUrl"
                  type="text"
                  value={baseSheetUrl}
                  onChange={(e) => setBaseSheetUrl(e.target.value)}
                  placeholder="Enter your published Google Sheets URL"
                  data-testid="input-base-url"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(gids).map(([key, value]) => (
                  <div key={key}>
                    <Label htmlFor={key}>{key} GID</Label>
                    <Input
                      id={key}
                      type="text"
                      value={value}
                      onChange={(e) => handleGidChange(key, e.target.value)}
                      placeholder={`GID for ${key}`}
                      data-testid={`input-gid-${key}`}
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoRefresh"
                    checked={autoRefresh}
                    onCheckedChange={(checked) => setAutoRefresh(checked as boolean)}
                    data-testid="checkbox-auto-refresh"
                  />
                  <Label htmlFor="autoRefresh" className="text-sm">
                    Auto-refresh every 30 seconds
                  </Label>
                </div>
                <Button 
                  onClick={fetchAllData}
                  disabled={loading}
                  data-testid="button-load-data"
                >
                  <Database className="mr-2 h-4 w-4" />
                  Load Data
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Loading State */}
        {loading && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full loading-spinner"></div>
                <span className="text-foreground">Loading dashboard data...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Alert className="mb-8" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Yesterday vs Today Comparison */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle>Yesterday vs Today Comparison</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Talk Time Comparison */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Talk Time (Minutes)</span>
                  <MessageCircle className="h-4 w-4 text-secondary" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Yesterday</span>
                    <span className="text-sm font-semibold" data-testid="text-yesterday-talk-time">
                      {getYesterdayData(data.talkTimeDaily, 'Date')?.['Total Minutes'] || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Today</span>
                    <span className="text-sm font-semibold" data-testid="text-today-talk-time">
                      {getTodayData(data.talkTimeDaily, 'Date')?.['Total Minutes'] || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t">
                    <span className="text-xs font-medium">Change</span>
                    <div className="flex items-center space-x-1">
                      {(() => {
                        const yesterday = parseFloat(getYesterdayData(data.talkTimeDaily, 'Date')?.['Total Minutes'] || '0');
                        const today = parseFloat(getTodayData(data.talkTimeDaily, 'Date')?.['Total Minutes'] || '0');
                        const change = today - yesterday;
                        const isPositive = change >= 0;
                        return (
                          <>
                            {isPositive ? <ArrowUp className="h-3 w-3 text-success" /> : <ArrowDown className="h-3 w-3 text-destructive" />}
                            <span className={`text-xs font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
                              {Math.abs(change).toFixed(0)}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversions Comparison */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Conversions</span>
                  <CheckCircle className="h-4 w-4 text-accent" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Yesterday</span>
                    <span className="text-sm font-semibold" data-testid="text-yesterday-conversions">
                      {getYesterdayData(data.conversionDaily, 'Date')?.['count Loan Value'] || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Today</span>
                    <span className="text-sm font-semibold" data-testid="text-today-conversions-compare">
                      {getTodayData(data.conversionDaily, 'Date')?.['count Loan Value'] || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t">
                    <span className="text-xs font-medium">Change</span>
                    <div className="flex items-center space-x-1">
                      {(() => {
                        const yesterday = getYesterdayData(data.conversionDaily, 'Date')?.['count Loan Value'] || 0;
                        const today = getTodayData(data.conversionDaily, 'Date')?.['count Loan Value'] || 0;
                        const change = today - yesterday;
                        const isPositive = change >= 0;
                        return (
                          <>
                            {isPositive ? <ArrowUp className="h-3 w-3 text-success" /> : <ArrowDown className="h-3 w-3 text-destructive" />}
                            <span className={`text-xs font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
                              {Math.abs(change)}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Leads Grabbed Comparison */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Leads Grabbed</span>
                  <Users className="h-4 w-4 text-success" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Yesterday</span>
                    <span className="text-sm font-semibold" data-testid="text-yesterday-leads">
                      {getYesterdayData(data.leadsGrabbedDaily, 'Date')?.['Leads Grabbed'] || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Today</span>
                    <span className="text-sm font-semibold" data-testid="text-today-leads-compare">
                      {getTodayData(data.leadsGrabbedDaily, 'Date')?.['Leads Grabbed'] || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t">
                    <span className="text-xs font-medium">Change</span>
                    <div className="flex items-center space-x-1">
                      {(() => {
                        const yesterday = getYesterdayData(data.leadsGrabbedDaily, 'Date')?.['Leads Grabbed'] || 0;
                        const today = getTodayData(data.leadsGrabbedDaily, 'Date')?.['Leads Grabbed'] || 0;
                        const change = today - yesterday;
                        const isPositive = change >= 0;
                        return (
                          <>
                            {isPositive ? <ArrowUp className="h-3 w-3 text-success" /> : <ArrowDown className="h-3 w-3 text-destructive" />}
                            <span className={`text-xs font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
                              {Math.abs(change)}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Units Uploaded Card */}
          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Units Uploaded</p>
                  <p className="text-sm text-muted-foreground mb-1">Last Week</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-bold text-foreground" data-testid="text-weekly-units">
                      {data.udDollarWeekly.length > 0 ? data.udDollarWeekly[data.udDollarWeekly.length - 1]['Unit Count'] || 0 : 0}
                    </p>
                    <Badge variant="outline" className="text-success">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      12.5%
                    </Badge>
                  </div>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-primary" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Calls Card */}
          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                  <p className="text-sm text-muted-foreground mb-1">Today</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-bold text-foreground" data-testid="text-today-calls">
                      {data.talkTimeDaily.length > 0 ? data.talkTimeDaily[data.talkTimeDaily.length - 1]['count Duration'] || 0 : 0}
                    </p>
                    <Badge variant="outline" className="text-success">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      8.3%
                    </Badge>
                  </div>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <Phone className="text-secondary" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversions Card */}
          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Conversions</p>
                  <p className="text-sm text-muted-foreground mb-1">Today</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-bold text-foreground" data-testid="text-today-conversions">
                      {data.conversionDaily.length > 0 ? data.conversionDaily[data.conversionDaily.length - 1]['count Loan Value'] || 0 : 0}
                    </p>
                    <Badge variant="outline" className="text-destructive">
                      <ArrowDownCircle className="w-3 h-3 mr-1" />
                      3.2%
                    </Badge>
                  </div>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="text-accent" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leads Grabbed Card */}
          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Leads Grabbed</p>
                  <p className="text-sm text-muted-foreground mb-1">Today</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-bold text-foreground" data-testid="text-today-leads">
                      {data.leadsGrabbedDaily.length > 0 ? data.leadsGrabbedDaily[data.leadsGrabbedDaily.length - 1]['Leads Grabbed'] || 0 : 0}
                    </p>
                    <Badge variant="outline" className="text-success">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      15.7%
                    </Badge>
                  </div>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <Users className="text-success" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Talk Time Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Daily Talk Time (Minutes)</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={data.talkTimeDaily}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="Date" 
                      style={{ fontSize: '0.75rem' }} 
                      tick={{ fontSize: '0.75rem' }} 
                      height={60} 
                    />
                    <YAxis style={{ fontSize: '0.75rem' }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '0.875rem' }} />
                    <Line 
                      type="monotone" 
                      dataKey="Total Minutes" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Dollars Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Daily Conversions (Dollars)</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={data.conversionDaily}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="Date" 
                      style={{ fontSize: '0.75rem' }} 
                      tick={{ fontSize: '0.75rem' }} 
                      height={60} 
                    />
                    <YAxis 
                      style={{ fontSize: '0.75rem' }} 
                      tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} 
                    />
                    <Tooltip formatter={(value) => `$${new Intl.NumberFormat('en-US').format(value as number)}`} />
                    <Legend wrapperStyle={{ fontSize: '0.875rem' }} />
                    <Line 
                      type="monotone" 
                      dataKey="Total Dollars" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={2} 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Insights & Anomaly Detection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle>Performance Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {generatePerformanceInsights().map((insight, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                    <insight.icon className={`h-5 w-5 mt-0.5 text-${insight.color}`} />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-foreground">{insight.type}</h4>
                      <p className="text-sm text-muted-foreground">{insight.message}</p>
                      {insight.action && (
                        <p className="text-xs text-primary mt-1 italic">
                          💡 {insight.action}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {generatePerformanceInsights().length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No insights available yet. More data needed.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Anomaly Detection */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-accent" />
                <CardTitle>Anomaly Detection</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {detectAnomalies().map((anomaly, index) => (
                  <Alert key={index} variant="destructive">
                    <anomaly.icon className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{anomaly.type}:</strong> {anomaly.message}
                    </AlertDescription>
                  </Alert>
                ))}
                {detectAnomalies().length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No anomalies detected. All metrics look normal.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Forecasting & Staffing Planning */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Trend Forecasting */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-secondary" />
                <CardTitle>Trend Forecasting</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const forecast = calculateTrendForecast();
                return forecast ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-secondary/10 rounded-lg">
                        <div className="text-2xl font-bold text-secondary">{forecast.projectedMonthlyConversions}</div>
                        <div className="text-xs text-muted-foreground">Projected Monthly</div>
                      </div>
                      <div className="text-center p-4 bg-primary/10 rounded-lg">
                        <div className="text-2xl font-bold text-primary">+{forecast.projectedAdditional}</div>
                        <div className="text-xs text-muted-foreground">Remaining This Month</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">
                        Based on {forecast.dailyAverage} daily average
                      </div>
                      <Badge variant={forecast.confidence === 'high' ? 'secondary' : 'outline'} className="mt-2">
                        {forecast.confidence} confidence
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Need at least 7 days of data for forecasting</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Staffing Planning */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-success" />
                <CardTitle>Staffing Planning</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const staffing = calculateStaffingNeeds();
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-foreground">{staffing.currentStaff}</div>
                        <div className="text-xs text-muted-foreground">Current Staff</div>
                      </div>
                      <div className="text-center p-4 bg-success/10 rounded-lg">
                        <div className="text-2xl font-bold text-success">{staffing.recommendedStaff}</div>
                        <div className="text-xs text-muted-foreground">Recommended</div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Conversion Rate:</span>
                        <span className="font-medium">{staffing.conversionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Call Duration:</span>
                        <span className="font-medium">{staffing.avgCallDuration} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Team Efficiency:</span>
                        <span className="font-medium">{staffing.efficiency}%</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Coaching Dashboard */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-accent" />
              <CardTitle>Coaching Dashboard</CardTitle>
              <Badge variant="outline">{generateCoachingInsights().length} reps need attention</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generateCoachingInsights().map((coaching, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${coaching.priority === 'high' ? 'border-destructive bg-destructive/5' : 'border-accent bg-accent/5'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground">{coaching.rep}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant={coaching.priority === 'high' ? 'destructive' : 'secondary'}>
                        {coaching.priority} priority
                      </Badge>
                      <span className="text-sm text-muted-foreground">{coaching.performance}% of avg</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {coaching.areas.map((area: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              {generateCoachingInsights().length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Great job! All reps are performing well.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications Center */}
        {notifications.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-destructive" />
                  <CardTitle>Active Notifications</CardTitle>
                </div>
                <Badge variant="destructive">{notifications.filter(n => !n.read).length} unread</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.slice(0, 5).map((notification, index) => (
                  <div key={notification.id} className={`flex items-start space-x-3 p-3 rounded-lg ${notification.severity === 'high' ? 'bg-destructive/10' : 'bg-accent/10'}`}>
                    <AlertTriangle className={`h-4 w-4 mt-0.5 ${notification.severity === 'high' ? 'text-destructive' : 'text-accent'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">{notification.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                {notifications.length > 5 && (
                  <div className="text-center text-sm text-muted-foreground">
                    +{notifications.length - 5} more notifications
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rep Performance with Alerts */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <CardTitle>Individual Rep Performance</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">Alert threshold: 50% of team average</span>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const { repStats, teamAverage } = calculateRepPerformance();
              const underperformers = repStats.filter((rep: any) => rep.isUnderperforming);
              
              return (
                <div className="space-y-6">
                  {/* Alert Section for Underperformers */}
                  {underperformers.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{underperformers.length} rep(s) are performing below 50% of team average:</strong>
                        <div className="mt-2">
                          {underperformers.map((rep: any, index: number) => (
                            <Badge key={index} variant="destructive" className="mr-2 mb-1">
                              {rep.name}
                            </Badge>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Performance Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm data-table">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">Representative</th>
                          <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                          <th className="text-right py-3 px-2 font-medium text-muted-foreground">Conversions</th>
                          <th className="text-right py-3 px-2 font-medium text-muted-foreground">Conv. %</th>
                          <th className="text-right py-3 px-2 font-medium text-muted-foreground">Conversion $</th>
                          <th className="text-right py-3 px-2 font-medium text-muted-foreground">Performance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {repStats.map((rep: any, index: number) => (
                          <tr key={index} className={`border-b border-border hover:bg-muted/50 transition-colors ${rep.isUnderperforming ? 'bg-destructive/5' : ''}`}>
                            <td className="py-3 px-2 text-foreground font-medium" data-testid={`text-rep-performance-${index}`}>
                              <div className="flex items-center space-x-2">
                                <span>{rep.name}</span>
                                {rep.isUnderperforming && <AlertCircle className="h-4 w-4 text-destructive" />}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center">
                              {rep.isUnderperforming ? (
                                <Badge variant="destructive" className="text-xs">
                                  At Risk
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Good
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right text-foreground font-semibold">
                              {rep.conversions}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span className={`font-medium ${rep.cohortConversionRate < 10 ? 'text-destructive' : rep.cohortConversionRate > 20 ? 'text-success' : 'text-foreground'}`}>
                                {rep.cohortConversionRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right text-success font-semibold">
                              ${new Intl.NumberFormat('en-US').format(rep.conversionDollars)}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                {rep.conversionPerformance >= 100 ? (
                                  <TrendingUp className="h-3 w-3 text-success" />
                                ) : rep.conversionPerformance < 50 ? (
                                  <ArrowDown className="h-3 w-3 text-destructive" />
                                ) : (
                                  <ArrowUp className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span className={`text-xs font-medium ${rep.conversionPerformance < 50 ? 'text-destructive' : rep.conversionPerformance > 100 ? 'text-success' : 'text-muted-foreground'}`}>
                                  vs avg
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Team Average Summary */}
                  <div className="bg-muted/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-foreground mb-3">Team Averages</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Conversions</div>
                        <div className="text-lg font-semibold text-foreground">{teamAverage.conversions.toFixed(1)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Conversion $</div>
                        <div className="text-lg font-semibold text-success">${new Intl.NumberFormat('en-US').format(teamAverage.conversionDollars)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Uploads</div>
                        <div className="text-lg font-semibold text-foreground">{teamAverage.uploads.toFixed(1)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Cohort Conv. Rate</div>
                        <div className="text-lg font-semibold text-accent">{teamAverage.cohortConversionRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Data Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Leads Behind Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CardTitle>Leads & Opportunities Behind</CardTitle>
                  <div className="w-2 h-2 bg-destructive rounded-full"></div>
                </div>
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm data-table">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Representative</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Leads Behind</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Opps Behind</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leadsBehindSummary.map((item: any, index: number) => (
                      <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2 text-foreground font-medium" data-testid={`text-rep-name-${index}`}>
                          {item['Lead Owner']}
                        </td>
                        <td className="py-3 px-2 text-right text-destructive font-semibold">
                          {item['Leads Behind ']}
                        </td>
                        <td className="py-3 px-2 text-right text-destructive font-semibold">
                          {item['Opp Behind']}
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-foreground">
                          {item.Total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* MTD Rep Performance */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>MTD Rep Performance</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">USD</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm data-table">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Representative</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">MTD Dollars</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">MTD Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.conversionRepMonthly.map((item: any, index: number) => (
                      <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2 text-foreground font-medium" data-testid={`text-rep-performance-${index}`}>
                          {item['Rep Name']}
                        </td>
                        <td className="py-3 px-2 text-right text-success font-semibold">
                          ${new Intl.NumberFormat('en-US').format(item['MTD Dollars'])}
                        </td>
                        <td className="py-3 px-2 text-right text-foreground">
                          {item['MTD Units']}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
