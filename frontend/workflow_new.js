// This file contains the new render section for the Workflow component
// It replaces everything from "if (loading)" to the closing "}" of the Workflow function

    const handleSaveAutomation = () => {
        if (!currentAutomation.name.trim()) { alert('Please enter an automation name'); return; }
        const newAuto = { ...currentAutomation, id: currentAutomation.id || Date.now(), createdAt: new Date().toISOString() };
        const updated = currentAutomation.id ? automations.map(a => a.id === currentAutomation.id ? newAuto : a) : [...automations, newAuto];
        saveAutomations(updated);
        setShowCreateModal(false);
        setCurrentAutomation({ id: null, name: '', enabled: true, trigger: { type: 'time', value: '09:00', label: 'Every day at 9:00 AM' }, condition: { type: 'tasks_pending', operator: '>', value: '0', label: 'If pending tasks > 0' }, action: { type: 'notification', value: 'Complete your pending tasks!', label: 'Send notification reminder' }, schedule: { type: 'daily', value: '1', label: 'Repeat daily' } });
        setEditingNode(null);
    };

    const handleDeleteAutomation = (id) => { if (confirm('Delete this automation?')) saveAutomations(automations.filter(a => a.id !== id)); };
    const handleToggleAutomation = (id) => { saveAutomations(automations.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a)); };
    const handleLoadPreset = (preset) => { setCurrentAutomation({ ...preset, id: null, enabled: true }); setShowCreateModal(true); };
    const handleEditAutomation = (auto) => { setCurrentAutomation(auto); setShowCreateModal(true); };

    // Node builder helper
    const makeNode = (nodeType, icon, color, title, label, isLast) => {
        return React.createElement(React.Fragment, { key: nodeType },
            React.createElement('div', {
                onClick: () => setEditingNode(editingNode === nodeType ? null : nodeType),
                style: { flex: 1, minWidth: '160px', padding: '20px', backgroundColor: editingNode === nodeType ? 'rgba(99, 102, 241, 0.12)' : 'rgba(20, 20, 32, 0.85)', borderRadius: '14px', border: editingNode === nodeType ? '2px solid ' + color : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.3s', position: 'relative', textAlign: 'center' }
            },
                React.createElement('div', { style: { width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, ' + color + '22, ' + color + '44)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '24px' } }, icon),
                React.createElement('h4', { style: { margin: '0 0 6px 0', color: color, fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' } }, title),
                React.createElement('p', { style: { margin: '0', color: '#f0f0f5', fontSize: '13px', fontWeight: '500' } }, label),
                React.createElement('p', { style: { margin: '6px 0 0', color: '#6b6b80', fontSize: '11px' } }, '✎ Click to edit')
            ),
            !isLast && React.createElement('div', { style: { display: 'flex', alignItems: 'center', padding: '0 4px', color: '#6366f1', fontSize: '20px', flexShrink: 0 } },
                React.createElement('div', { style: { width: '40px', height: '2px', background: 'linear-gradient(90deg, ' + color + ', #6366f1)', position: 'relative' } },
                    React.createElement('div', { style: { position: 'absolute', right: '-6px', top: '-4px', width: '0', height: '0', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid #6366f1' } })
                )
            )
        );
    };

    // Node editor panel
    const makeNodeEditor = (nodeType, options, currentVal, onSelect) => {
        if (editingNode !== nodeType) return null;
        return React.createElement('div', { style: { padding: '20px', backgroundColor: 'rgba(20, 20, 32, 0.9)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)', marginTop: '16px', animation: 'slideUp 0.3s ease-out' } },
            React.createElement('h4', { style: { margin: '0 0 14px 0', color: '#818cf8', fontSize: '13px', fontWeight: '600' } }, '⚙️ Configure ' + nodeType.charAt(0).toUpperCase() + nodeType.slice(1)),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' } },
                options.map(opt => React.createElement('div', { key: opt.type, onClick: () => {
                    const updated = { ...currentAutomation };
                    updated[nodeType] = { ...updated[nodeType], type: opt.type, label: opt.label + ' — ' + opt.desc };
                    setCurrentAutomation(updated);
                }, style: { padding: '14px', backgroundColor: currentVal.type === opt.type ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)', border: currentVal.type === opt.type ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' } },
                    React.createElement('h5', { style: { margin: '0 0 4px 0', color: '#f0f0f5', fontSize: '13px' } }, opt.label),
                    React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '11px' } }, opt.desc)
                ))
            ),
            nodeType === 'trigger' && currentAutomation.trigger.type === 'time' && React.createElement('div', { style: { marginTop: '12px' } },
                React.createElement('label', { style: { color: '#a0a0b8', fontSize: '12px', display: 'block', marginBottom: '6px' } }, 'Time:'),
                React.createElement('input', { type: 'time', value: currentAutomation.trigger.value, onChange: (e) => setCurrentAutomation({ ...currentAutomation, trigger: { ...currentAutomation.trigger, value: e.target.value, label: 'Every day at ' + e.target.value } }), style: { padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.06)', color: '#f0f0f5', fontSize: '14px' } })
            ),
            nodeType === 'action' && React.createElement('div', { style: { marginTop: '12px' } },
                React.createElement('label', { style: { color: '#a0a0b8', fontSize: '12px', display: 'block', marginBottom: '6px' } }, 'Message / Value:'),
                React.createElement('input', { type: 'text', value: currentAutomation.action.value, onChange: (e) => setCurrentAutomation({ ...currentAutomation, action: { ...currentAutomation.action, value: e.target.value } }), placeholder: 'Enter action value...', style: { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.06)', color: '#f0f0f5', fontSize: '14px', boxSizing: 'border-box' } })
            )
        );
    };

    if (loading) return React.createElement('div', { className: 'container' }, React.createElement('p', { style: { textAlign: 'center', color: '#6b6b80' } }, 'Loading...'));

    return React.createElement('div', { className: 'container' },
        // Header
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' } },
            React.createElement('div', null,
                React.createElement('h2', { style: { margin: '0 0 6px 0', color: '#f0f0f5', fontSize: '24px', fontWeight: '700' } }, '⚡ Task Automation'),
                React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '13px' } }, 'Build visual automation pipelines — Trigger → Condition → Action')
            ),
            React.createElement('button', { onClick: () => { setCurrentAutomation({ id: null, name: '', enabled: true, trigger: { type: 'time', value: '09:00', label: 'Every day at 9:00 AM' }, condition: { type: 'tasks_pending', operator: '>', value: '0', label: 'If pending tasks > 0' }, action: { type: 'notification', value: 'Complete your pending tasks!', label: 'Send notification reminder' }, schedule: { type: 'daily', value: '1', label: 'Repeat daily' } }); setShowCreateModal(true); setEditingNode(null); }, style: { padding: '10px 20px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' } }, '➕ Create Automation')
        ),

        // Tab Switcher
        React.createElement('div', { style: { display: 'flex', gap: '4px', marginBottom: '24px', padding: '4px', backgroundColor: 'rgba(20, 20, 32, 0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' } },
            ['builder', 'history', 'ai'].map(v => React.createElement('button', { key: v, onClick: () => setActiveView(v), style: { flex: 1, padding: '10px 16px', backgroundColor: activeView === v ? 'rgba(99,102,241,0.15)' : 'transparent', border: activeView === v ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent', borderRadius: '8px', color: activeView === v ? '#818cf8' : '#6b6b80', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' } }, v === 'builder' ? '🔧 Automations' : v === 'history' ? '📜 Execution History' : '🤖 AI Workflows'))
        ),

        // ========== BUILDER VIEW ==========
        activeView === 'builder' && React.createElement('div', null,
            // Preset Templates
            React.createElement('div', { style: { marginBottom: '28px' } },
                React.createElement('h3', { style: { margin: '0 0 14px 0', color: '#f0f0f5', fontSize: '14px', fontWeight: '700', letterSpacing: '0.5px' } }, '🚀 Quick Start Templates'),
                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' } },
                    presetAutomations.map((preset, i) => React.createElement('div', { key: i, onClick: () => handleLoadPreset(preset), style: { padding: '16px', backgroundColor: 'rgba(20, 20, 32, 0.75)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all 0.25s' }, onMouseEnter: e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'; }, onMouseLeave: e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; } },
                        React.createElement('h4', { style: { margin: '0 0 8px 0', color: '#f0f0f5', fontSize: '14px', fontWeight: '600' } }, preset.name),
                        React.createElement('p', { style: { margin: '0 0 4px 0', color: '#a0a0b8', fontSize: '11px' } }, preset.trigger.label),
                        React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '11px' } }, '→ ' + preset.action.label),
                        React.createElement('span', { style: { display: 'inline-block', marginTop: '8px', padding: '3px 10px', backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: '20px', fontSize: '10px', fontWeight: '600' } }, '+ Use Template')
                    ))
                )
            ),

            // Saved Automations List
            React.createElement('div', { style: { marginBottom: '28px' } },
                React.createElement('h3', { style: { margin: '0 0 14px 0', color: '#f0f0f5', fontSize: '14px', fontWeight: '700' } }, '📋 My Automations (' + automations.length + ')'),
                automations.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '40px', backgroundColor: 'rgba(20, 20, 32, 0.5)', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.08)' } },
                    React.createElement('p', { style: { fontSize: '36px', margin: '0 0 8px' } }, '⚡'),
                    React.createElement('p', { style: { color: '#6b6b80', fontSize: '13px' } }, 'No automations yet. Create one or use a template!')
                ),
                automations.map(auto => React.createElement('div', { key: auto.id, style: { padding: '18px', marginBottom: '10px', backgroundColor: 'rgba(20, 20, 32, 0.75)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '4px solid ' + (auto.enabled ? '#10b981' : '#6b6b80'), transition: 'all 0.2s', opacity: auto.enabled ? 1 : 0.6 } },
                    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                        React.createElement('div', { style: { flex: 1 } },
                            React.createElement('h4', { style: { margin: '0 0 6px 0', color: '#f0f0f5', fontSize: '14px', fontWeight: '600' } }, auto.name),
                            React.createElement('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '11px' } },
                                React.createElement('span', { style: { padding: '3px 8px', backgroundColor: 'rgba(251,191,36,0.1)', color: '#fbbf24', borderRadius: '6px' } }, '⏰ ' + auto.trigger.label),
                                React.createElement('span', { style: { color: '#6b6b80' } }, '→'),
                                React.createElement('span', { style: { padding: '3px 8px', backgroundColor: 'rgba(56,189,248,0.1)', color: '#38bdf8', borderRadius: '6px' } }, '🔍 ' + auto.condition.label),
                                React.createElement('span', { style: { color: '#6b6b80' } }, '→'),
                                React.createElement('span', { style: { padding: '3px 8px', backgroundColor: 'rgba(52,211,153,0.1)', color: '#34d399', borderRadius: '6px' } }, '🚀 ' + auto.action.label)
                            )
                        ),
                        React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' } },
                            React.createElement('button', { onClick: () => handleToggleAutomation(auto.id), style: { width: '44px', height: '24px', borderRadius: '12px', border: 'none', backgroundColor: auto.enabled ? '#10b981' : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'all 0.3s' } },
                                React.createElement('div', { style: { width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '3px', left: auto.enabled ? '23px' : '3px', transition: 'left 0.3s' } })
                            ),
                            React.createElement('button', { onClick: () => handleEditAutomation(auto), style: { padding: '6px 10px', backgroundColor: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' } }, '✏️'),
                            React.createElement('button', { onClick: () => handleDeleteAutomation(auto.id), style: { padding: '6px 10px', backgroundColor: 'rgba(248,113,113,0.12)', color: '#f87171', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' } }, '✕')
                        )
                    )
                ))
            )
        ),

        // ========== HISTORY VIEW ==========
        activeView === 'history' && React.createElement('div', null,
            React.createElement('h3', { style: { margin: '0 0 16px 0', color: '#f0f0f5' } }, '📜 Execution History'),
            workflows.length === 0 && React.createElement('p', { style: { textAlign: 'center', color: '#6b6b80', padding: '30px' } }, 'No workflow executions yet.'),
            workflows.map(workflow => React.createElement('div', { key: workflow.id, style: { backgroundColor: 'rgba(20, 20, 32, 0.75)', padding: '18px', marginBottom: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '4px solid ' + (workflow.status === 'completed' ? '#10b981' : workflow.status === 'failed' ? '#ef4444' : '#f59e0b'), cursor: 'pointer', transition: 'all 0.2s' }, onClick: () => setSelectedWorkflow(selectedWorkflow === workflow.id ? null : workflow.id) },
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' } },
                    React.createElement('div', { style: { flex: 1 } },
                        React.createElement('h4', { style: { margin: '0 0 6px', color: '#f0f0f5', fontSize: '14px', wordBreak: 'break-word' } }, workflow.user_request || workflow.request || 'Workflow ' + workflow.id),
                        React.createElement('p', { style: { margin: '0', color: '#6b6b80', fontSize: '12px' } }, '📅 ' + new Date(workflow.created_at).toLocaleString()),
                        selectedWorkflow === workflow.id && workflow.result && React.createElement('div', { style: { marginTop: '12px', padding: '12px', backgroundColor: 'rgba(20, 20, 32, 0.5)', borderRadius: '8px', borderLeft: '3px solid #6366f1', fontSize: '13px', color: '#a0a0b8', maxHeight: '200px', overflowY: 'auto' } },
                            React.createElement('strong', null, 'Result:'),
                            React.createElement('p', { style: { margin: '8px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } }, workflow.result)
                        )
                    ),
                    React.createElement('span', { style: { padding: '6px 12px', backgroundColor: workflow.status === 'completed' ? 'rgba(52,211,153,0.12)' : workflow.status === 'failed' ? 'rgba(248,113,113,0.12)' : 'rgba(251,191,36,0.12)', color: workflow.status === 'completed' ? '#34d399' : workflow.status === 'failed' ? '#f87171' : '#fbbf24', borderRadius: '20px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' } }, (workflow.status === 'completed' ? '✓' : workflow.status === 'failed' ? '✕' : '⟳') + ' ' + workflow.status)
                )
            ))
        ),

        // ========== AI WORKFLOW VIEW ==========
        activeView === 'ai' && React.createElement('div', null,
            React.createElement('div', { style: { marginBottom: '24px', padding: '24px', backgroundColor: 'rgba(99, 102, 241, 0.08)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)' } },
                React.createElement('h3', { style: { margin: '0 0 14px 0', color: '#f0f0f5', fontSize: '15px', fontWeight: '700' } }, '🤖 AI Multi-Agent Workflow'),
                React.createElement('p', { style: { color: '#a0a0b8', fontSize: '13px', marginBottom: '16px' } }, 'Describe a task and let AI agents coordinate to complete it.'),
                React.createElement('textarea', { placeholder: 'Describe your task in detail...', value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), style: { display: 'block', width: '100%', padding: '12px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '14px', minHeight: '100px', fontFamily: 'inherit', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.04)', color: '#f0f0f5' } }),
                React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                    React.createElement('button', { onClick: handleExecuteWorkflow, disabled: executing || !formData.description.trim(), style: { padding: '12px 25px', background: executing || !formData.description.trim() ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '8px', cursor: executing ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px' } }, executing ? '⟳ Executing...' : '▶ Start Workflow')
                )
            )
        ),

        // ========== CREATE/EDIT MODAL ==========
        showCreateModal && React.createElement('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }, onClick: (e) => { if (e.target === e.currentTarget) { setShowCreateModal(false); setEditingNode(null); } } },
            React.createElement('div', { style: { backgroundColor: 'rgba(18, 18, 26, 0.98)', borderRadius: '20px', padding: '32px', maxWidth: '800px', width: '95%', maxHeight: '85vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(99,102,241,0.1)' } },
                // Modal Header
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' } },
                    React.createElement('h2', { style: { margin: 0, color: '#f0f0f5', fontSize: '20px' } }, currentAutomation.id ? '✏️ Edit Automation' : '⚡ New Automation'),
                    React.createElement('button', { onClick: () => { setShowCreateModal(false); setEditingNode(null); }, style: { background: 'none', border: 'none', color: '#6b6b80', fontSize: '24px', cursor: 'pointer' } }, '✕')
                ),
                // Name Input
                React.createElement('div', { style: { marginBottom: '24px' } },
                    React.createElement('label', { style: { color: '#a0a0b8', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' } }, 'Automation Name'),
                    React.createElement('input', { type: 'text', value: currentAutomation.name, onChange: (e) => setCurrentAutomation({ ...currentAutomation, name: e.target.value }), placeholder: 'e.g., Morning Task Reminder', style: { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)', color: '#f0f0f5', fontSize: '15px', boxSizing: 'border-box', fontFamily: 'inherit' } })
                ),
                // Visual Pipeline
                React.createElement('div', { style: { marginBottom: '20px' } },
                    React.createElement('label', { style: { color: '#a0a0b8', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '14px', letterSpacing: '1px', textTransform: 'uppercase' } }, 'Automation Pipeline'),
                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '0', overflowX: 'auto', padding: '8px 0' } },
                        makeNode('trigger', '⏰', '#fbbf24', 'TRIGGER', currentAutomation.trigger.label, false),
                        makeNode('condition', '🔍', '#38bdf8', 'CONDITION', currentAutomation.condition.label, false),
                        makeNode('action', '🚀', '#34d399', 'ACTION', currentAutomation.action.label, false),
                        makeNode('schedule', '🔁', '#a78bfa', 'SCHEDULE', currentAutomation.schedule.label, true)
                    )
                ),
                // Node Editor (shown when a node is clicked)
                makeNodeEditor('trigger', triggerOptions, currentAutomation.trigger),
                makeNodeEditor('condition', conditionOptions, currentAutomation.condition),
                makeNodeEditor('action', actionOptions, currentAutomation.action),
                makeNodeEditor('schedule', scheduleOptions, currentAutomation.schedule),
                // Save Button
                React.createElement('div', { style: { display: 'flex', gap: '10px', marginTop: '24px' } },
                    React.createElement('button', { onClick: () => { setShowCreateModal(false); setEditingNode(null); }, style: { flex: 1, padding: '12px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#a0a0b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' } }, 'Cancel'),
                    React.createElement('button', { onClick: handleSaveAutomation, style: { flex: 2, padding: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' } }, currentAutomation.id ? '💾 Update Automation' : '⚡ Save Automation')
                )
            )
        )
    );
}
