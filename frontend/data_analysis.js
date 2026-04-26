// ====== DATA ANALYSIS COMPONENT ======
function DataAnalysis({ refreshTrigger, onRefresh }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartType, setChartType] = useState('bar');
    const [analysisType, setAnalysisType] = useState('overview');
    const [aiInsights, setAiInsights] = useState([]);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [uploadedData, setUploadedData] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [dateRange, setDateRange] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const chartRefs = { bar: useRef(null), line: useRef(null), pie: useRef(null), donut: useRef(null) };
    const chartInstances = useRef({});

    useEffect(() => {
        fetch('http://localhost:8080/api/tasks')
            .then(r => r.json()).then(data => { setTasks(data || []); setLoading(false); })
            .catch(() => { setTasks([]); setLoading(false); });
    }, [refreshTrigger]);

    // Computed analytics
    const analytics = useMemo(() => {
        if (!tasks.length) return { total: 0, completed: 0, pending: 0, efficiency: 0, byCategory: {}, byPriority: {}, byDay: {}, byStatus: {} };
        const completed = tasks.filter(t => t.status === 'completed').length;
        const pending = tasks.filter(t => t.status !== 'completed').length;
        const byCategory = {}; const byPriority = { high: 0, medium: 0, low: 0 }; const byDay = {}; const byStatus = {};
        tasks.forEach(t => {
            const cat = t.category || 'uncategorized'; byCategory[cat] = (byCategory[cat] || 0) + 1;
            const pri = t.priority || 'medium'; byPriority[pri] = (byPriority[pri] || 0) + 1;
            const day = new Date(t.created_at).toLocaleDateString('en-US', { weekday: 'short' }); byDay[day] = (byDay[day] || 0) + 1;
            const st = t.status || 'pending'; byStatus[st] = (byStatus[st] || 0) + 1;
        });
        return { total: tasks.length, completed, pending, efficiency: tasks.length ? Math.round((completed / tasks.length) * 100) : 0, byCategory, byPriority, byDay, byStatus };
    }, [tasks]);

    // Chart rendering
    useEffect(() => {
        if (loading || !window.Chart) return;
        Object.values(chartInstances.current).forEach(c => { try { c.destroy(); } catch(e){} });
        chartInstances.current = {};
        const darkGrid = { color: 'rgba(255,255,255,0.06)' };
        const darkTick = { color: '#6b6b80' };
        const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#f87171','#34d399'];

        // Bar Chart
        if (chartRefs.bar.current) {
            const ctx = chartRefs.bar.current.getContext('2d');
            const labels = Object.keys(analytics.byCategory);
            chartInstances.current.bar = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Tasks by Category', data: labels.map(l => analytics.byCategory[l]), backgroundColor: colors.slice(0, labels.length).map(c => c + '88'), borderColor: colors.slice(0, labels.length), borderWidth: 2, borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#a0a0b8' } } }, scales: { x: { grid: darkGrid, ticks: darkTick }, y: { grid: darkGrid, ticks: darkTick, beginAtZero: true } } } });
        }
        // Line Chart
        if (chartRefs.line.current) {
            const ctx = chartRefs.line.current.getContext('2d');
            const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
            chartInstances.current.line = new Chart(ctx, { type: 'line', data: { labels: days, datasets: [{ label: 'Tasks Created', data: days.map(d => analytics.byDay[d] || 0), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#8b5cf6', pointRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#a0a0b8' } } }, scales: { x: { grid: darkGrid, ticks: darkTick }, y: { grid: darkGrid, ticks: darkTick, beginAtZero: true } } } });
        }
        // Pie Chart
        if (chartRefs.pie.current) {
            const ctx = chartRefs.pie.current.getContext('2d');
            const labels = Object.keys(analytics.byPriority);
            const pColors = { high: '#f87171', medium: '#fbbf24', low: '#34d399' };
            chartInstances.current.pie = new Chart(ctx, { type: 'pie', data: { labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)), datasets: [{ data: labels.map(l => analytics.byPriority[l]), backgroundColor: labels.map(l => pColors[l] || '#6366f1'), borderColor: 'rgba(20,20,32,0.9)', borderWidth: 3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#a0a0b8', padding: 16 } } } } });
        }
        // Donut Chart
        if (chartRefs.donut.current) {
            const ctx = chartRefs.donut.current.getContext('2d');
            const labels = Object.keys(analytics.byStatus);
            const sColors = { completed: '#34d399', pending: '#fbbf24', in_progress: '#38bdf8' };
            chartInstances.current.donut = new Chart(ctx, { type: 'doughnut', data: { labels: labels.map(l => l.replace('_',' ')), datasets: [{ data: labels.map(l => analytics.byStatus[l]), backgroundColor: labels.map(l => sColors[l] || '#a78bfa'), borderColor: 'rgba(20,20,32,0.9)', borderWidth: 3 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#a0a0b8', padding: 16 } } } } });
        }
        return () => { Object.values(chartInstances.current).forEach(c => { try { c.destroy(); } catch(e){} }); };
    }, [loading, tasks, analytics]);

    // AI Insights
    const generateInsights = () => {
        setInsightsLoading(true);
        const prompt = `Analyze this task data and provide 5 actionable insights:\n- Total: ${analytics.total}, Completed: ${analytics.completed}, Pending: ${analytics.pending}, Efficiency: ${analytics.efficiency}%\n- Categories: ${JSON.stringify(analytics.byCategory)}\n- Priority: ${JSON.stringify(analytics.byPriority)}\n- By Day: ${JSON.stringify(analytics.byDay)}\nProvide insights as bullet points.`;
        fetch('http://localhost:8080/api/ai-chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt })
        }).then(r => r.json()).then(data => {
            const text = data.assistant_response || 'No insights available';
            setAiInsights(text.split('\n').filter(l => l.trim()));
            setInsightsLoading(false);
        }).catch(() => { setAiInsights(['❌ Could not generate insights']); setInsightsLoading(false); });
    };

    // CSV Upload
    const handleFileUpload = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result;
            const lines = text.split('\n').filter(l => l.trim());
            const headers = lines[0].split(',').map(h => h.trim());
            const rows = lines.slice(1).map(l => { const vals = l.split(','); const obj = {}; headers.forEach((h, i) => obj[h] = (vals[i] || '').trim()); return obj; });
            setUploadedData({ headers, rows, filename: file.name });
        };
        reader.readAsText(file);
    };

    // Export Report
    const exportReport = () => {
        let report = '=== TaskMaster AI - Data Analysis Report ===\n';
        report += `Generated: ${new Date().toLocaleString()}\n\n`;
        report += `--- KPIs ---\nTotal Tasks: ${analytics.total}\nCompleted: ${analytics.completed}\nPending: ${analytics.pending}\nEfficiency: ${analytics.efficiency}%\n\n`;
        report += `--- By Category ---\n${Object.entries(analytics.byCategory).map(([k,v]) => `  ${k}: ${v}`).join('\n')}\n\n`;
        report += `--- By Priority ---\n${Object.entries(analytics.byPriority).map(([k,v]) => `  ${k}: ${v}`).join('\n')}\n\n`;
        if (aiInsights.length) report += `--- AI Insights ---\n${aiInsights.join('\n')}\n`;
        const blob = new Blob([report], { type: 'text/plain' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'taskmaster_analysis_report.txt'; a.click();
    };

    // Sort/filter tasks for table
    const filteredTasks = useMemo(() => {
        let result = [...tasks];
        if (searchQuery) result = result.filter(t => (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()));
        if (categoryFilter !== 'all') result = result.filter(t => (t.category || 'uncategorized') === categoryFilter);
        result.sort((a, b) => { const av = a[sortField] || ''; const bv = b[sortField] || ''; return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1); });
        return result;
    }, [tasks, searchQuery, categoryFilter, sortField, sortDir]);

    const categories = useMemo(() => [...new Set(tasks.map(t => t.category || 'uncategorized'))], [tasks]);

    // KPI Card helper
    const kpiCard = (icon, label, value, color, sub) => React.createElement('div', { style: { padding: '20px', backgroundColor: 'rgba(20,20,32,0.75)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', borderTop: '3px solid ' + color, transition: 'all 0.3s' }, onMouseEnter: e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'; }, onMouseLeave: e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' } },
            React.createElement('span', { style: { fontSize: '22px' } }, icon),
            React.createElement('span', { style: { color: '#6b6b80', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' } }, label)
        ),
        React.createElement('div', { style: { fontSize: '32px', fontWeight: '800', color: color, lineHeight: '1' } }, value),
        sub && React.createElement('p', { style: { margin: '6px 0 0', color: '#6b6b80', fontSize: '11px' } }, sub)
    );

    // Chart card helper
    const chartCard = (title, refKey, height) => React.createElement('div', { style: { padding: '20px', backgroundColor: 'rgba(20,20,32,0.75)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' } },
        React.createElement('h4', { style: { margin: '0 0 14px', color: '#f0f0f5', fontSize: '14px', fontWeight: '600' } }, title),
        React.createElement('div', { style: { height: height || '250px', position: 'relative' } },
            React.createElement('canvas', { ref: chartRefs[refKey] })
        )
    );

    if (loading) return React.createElement('div', { className: 'container' }, React.createElement('p', { style: { textAlign: 'center', color: '#6b6b80', padding: '40px' } }, '📊 Loading analytics...'));

    return React.createElement('div', { className: 'container' },
        // Header
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' } },
            React.createElement('div', null,
                React.createElement('h2', { style: { margin: '0 0 6px', color: '#f0f0f5', fontSize: '24px', fontWeight: '700' } }, '📊 Data Analysis Dashboard'),
                React.createElement('p', { style: { margin: 0, color: '#6b6b80', fontSize: '13px' } }, 'Real-time analytics from your task data — ' + analytics.total + ' tasks analyzed')
            ),
            React.createElement('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                React.createElement('label', { style: { padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' } },
                    '📤 Upload CSV', React.createElement('input', { type: 'file', accept: '.csv,.txt', onChange: handleFileUpload, style: { display: 'none' } })
                ),
                React.createElement('button', { onClick: () => { onRefresh(); }, style: { padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#a0a0b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' } }, '🔄 Refresh'),
                React.createElement('button', { onClick: exportReport, style: { padding: '8px 16px', backgroundColor: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' } }, '📥 Export Report')
            )
        ),

        // KPI Cards Row
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' } },
            kpiCard('📋', 'Total Tasks', analytics.total, '#6366f1', 'All tracked tasks'),
            kpiCard('✅', 'Completed', analytics.completed, '#34d399', Math.round((analytics.completed/Math.max(analytics.total,1))*100) + '% done'),
            kpiCard('⏳', 'Pending', analytics.pending, '#fbbf24', 'Needs attention'),
            kpiCard('🎯', 'Efficiency', analytics.efficiency + '%', analytics.efficiency >= 70 ? '#34d399' : analytics.efficiency >= 40 ? '#fbbf24' : '#f87171', analytics.efficiency >= 70 ? 'Great work!' : 'Room to improve')
        ),

        // Charts Grid
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' } },
            chartCard('📊 Tasks by Category', 'bar', '260px'),
            chartCard('📈 Weekly Activity', 'line', '260px'),
            chartCard('🎯 Priority Distribution', 'pie', '260px'),
            chartCard('📋 Status Breakdown', 'donut', '260px')
        ),

        // AI Insights Section
        React.createElement('div', { style: { marginBottom: '24px', padding: '24px', backgroundColor: 'rgba(99,102,241,0.06)', borderRadius: '14px', border: '1px solid rgba(99,102,241,0.15)' } },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
                React.createElement('h3', { style: { margin: 0, color: '#f0f0f5', fontSize: '16px', fontWeight: '700' } }, '🤖 AI-Powered Insights'),
                React.createElement('button', { onClick: generateInsights, disabled: insightsLoading, style: { padding: '8px 18px', background: insightsLoading ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '8px', cursor: insightsLoading ? 'wait' : 'pointer', fontSize: '12px', fontWeight: '600' } }, insightsLoading ? '⟳ Analyzing...' : '✨ Generate Insights')
            ),
            aiInsights.length === 0 && !insightsLoading && React.createElement('p', { style: { color: '#6b6b80', fontSize: '13px', textAlign: 'center', padding: '20px' } }, 'Click "Generate Insights" to get AI-powered analysis of your task data.'),
            aiInsights.length > 0 && React.createElement('div', { style: { display: 'grid', gap: '8px' } },
                aiInsights.map((insight, i) => React.createElement('div', { key: i, style: { padding: '12px 16px', backgroundColor: 'rgba(20,20,32,0.6)', borderRadius: '10px', borderLeft: '3px solid #818cf8', color: '#a0a0b8', fontSize: '13px', lineHeight: '1.6' } }, insight))
            )
        ),

        // Uploaded Data Preview
        uploadedData && React.createElement('div', { style: { marginBottom: '24px', padding: '20px', backgroundColor: 'rgba(20,20,32,0.75)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' } },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } },
                React.createElement('h3', { style: { margin: 0, color: '#f0f0f5', fontSize: '15px' } }, '📁 Uploaded: ' + uploadedData.filename + ' (' + uploadedData.rows.length + ' rows)'),
                React.createElement('button', { onClick: () => setUploadedData(null), style: { padding: '4px 12px', backgroundColor: 'rgba(248,113,113,0.12)', color: '#f87171', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' } }, '✕ Clear')
            ),
            React.createElement('div', { style: { overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' } },
                React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } },
                    React.createElement('thead', null, React.createElement('tr', null,
                        uploadedData.headers.map(h => React.createElement('th', { key: h, style: { padding: '10px 12px', backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: '600', whiteSpace: 'nowrap' } }, h))
                    )),
                    React.createElement('tbody', null,
                        uploadedData.rows.slice(0, 50).map((row, i) => React.createElement('tr', { key: i, style: { borderBottom: '1px solid rgba(255,255,255,0.04)' } },
                            uploadedData.headers.map(h => React.createElement('td', { key: h, style: { padding: '8px 12px', color: '#a0a0b8', whiteSpace: 'nowrap' } }, row[h] || '—'))
                        ))
                    )
                )
            )
        ),

        // Data Table
        React.createElement('div', { style: { padding: '20px', backgroundColor: 'rgba(20,20,32,0.75)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' } },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' } },
                React.createElement('h3', { style: { margin: 0, color: '#f0f0f5', fontSize: '15px' } }, '📋 Task Data Table'),
                React.createElement('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                    React.createElement('input', { type: 'text', placeholder: '🔍 Search tasks...', value: searchQuery, onChange: e => setSearchQuery(e.target.value), style: { padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f0f0f5', fontSize: '12px', width: '160px' } }),
                    React.createElement('select', { value: categoryFilter, onChange: e => setCategoryFilter(e.target.value), style: { padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f0f0f5', fontSize: '12px' } },
                        React.createElement('option', { value: 'all' }, 'All Categories'),
                        categories.map(c => React.createElement('option', { key: c, value: c }, c))
                    )
                )
            ),
            React.createElement('div', { style: { overflowX: 'auto', maxHeight: '350px', overflowY: 'auto' } },
                React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } },
                    React.createElement('thead', null, React.createElement('tr', null,
                        ['Title', 'Category', 'Priority', 'Status', 'Created'].map(h => React.createElement('th', { key: h, onClick: () => { const field = h.toLowerCase().replace(' ','_'); setSortField(field === 'created' ? 'created_at' : field); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }, style: { padding: '10px 12px', backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' } }, h + (sortField === (h.toLowerCase() === 'created' ? 'created_at' : h.toLowerCase()) ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')))
                    )),
                    React.createElement('tbody', null,
                        filteredTasks.slice(0, 50).map((t, i) => React.createElement('tr', { key: t.id || i, style: { borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }, onMouseEnter: e => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.04)', onMouseLeave: e => e.currentTarget.style.backgroundColor = 'transparent' },
                            React.createElement('td', { style: { padding: '10px 12px', color: '#f0f0f5', fontWeight: '500', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t.title || '—'),
                            React.createElement('td', { style: { padding: '10px 12px' } }, React.createElement('span', { style: { padding: '3px 8px', backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: '6px', fontSize: '11px' } }, t.category || 'uncategorized')),
                            React.createElement('td', { style: { padding: '10px 12px' } }, React.createElement('span', { style: { padding: '3px 8px', backgroundColor: t.priority === 'high' ? 'rgba(248,113,113,0.12)' : t.priority === 'low' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)', color: t.priority === 'high' ? '#f87171' : t.priority === 'low' ? '#34d399' : '#fbbf24', borderRadius: '6px', fontSize: '11px', fontWeight: '600' } }, (t.priority || 'medium'))),
                            React.createElement('td', { style: { padding: '10px 12px' } }, React.createElement('span', { style: { padding: '3px 8px', backgroundColor: t.status === 'completed' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)', color: t.status === 'completed' ? '#34d399' : '#fbbf24', borderRadius: '6px', fontSize: '11px', fontWeight: '600' } }, t.status || 'pending')),
                            React.createElement('td', { style: { padding: '10px 12px', color: '#6b6b80', whiteSpace: 'nowrap' } }, t.created_at ? new Date(t.created_at).toLocaleDateString() : '—')
                        ))
                    )
                )
            ),
            React.createElement('p', { style: { margin: '10px 0 0', color: '#6b6b80', fontSize: '11px', textAlign: 'right' } }, 'Showing ' + Math.min(filteredTasks.length, 50) + ' of ' + filteredTasks.length + ' tasks')
        )
    );
}
