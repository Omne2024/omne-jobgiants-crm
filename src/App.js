import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://okreuewrtorwkyidoawx.supabase.co/';
const SUPABASE_ANON_KEY = 'sb_publishable_Iznkoy_uNvS3-dqziX6KYQ_tKS6mvb0';
const GEMINI_API_KEY = 'AQ.Ab8RN6KbUwgs8ZZTFKCNqJa3TzJtTuF9_SmPlBZIdLaYpM3l8Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('Partner'); 
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [selectedRoleType, setSelectedRoleType] = useState('Partner');

  const [candidates, setCandidates] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const [pendingAction, setPendingAction] = useState(null);

  const [companyLogo, setCompanyLogo] = useState(() => {
    return localStorage.getItem('crm_custom_logo') || 'https://www.jobgiants.in/wp-content/uploads/2023/10/cropped-Logo-1.png';
  });
  
  const predefinedHRs = ['Sanchi', 'Sadaf', 'Anjali', 'Shrey'];
  const predefinedCompanies = ['Transom', 'HGS', 'iQor', 'Atain', 'Vertex Group', 'Shaadi.com', 'iEnergizer'];

  const hrDatabase = {
    'sanchi.aggarwal@jobgiants.in': { name: 'Sanchi', password: 'Sanwall@2024' },
    'sadaf.kazi@jobgiants.in': { name: 'Sadaf', password: 'Sadkaz@2025' },
    'anjali.srivastava@jobgiants.in': { name: 'Anjali', password: 'Anjsri@2026' }
  };

  const partnerEmails = ['suraj.jha@jobgiants.in', 'garimabansal@jobgiants.in'];

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    recruiter: '',
    company_name: '',
    process_name: '',
    client_poc: '',
    selection_date: '',
    joining_date: '',
    revenue: '',
    status: 'Yet to Join',
    invoice_status: 'Pending',
    invoice_number: '',
    payment_date: '',
    payment_mode: 'NEFT',
    notes: ''
  });

  const [otherRecruiterInput, setOtherRecruiterInput] = useState('');
  const [isOtherSelected, setIsOtherSelected] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState('All');
  const [filterStage, setFilterStage] = useState('All');
  const [filterHR, setFilterHR] = useState('All');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedForBatchInvoice, setSelectedForBatchInvoice] = useState([]);
  const [batchInvoiceNumber, setBatchInvoiceNumber] = useState('');

  // Floating AI Chat Widget States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your Omne JobGiants AI Assistant. How can I help you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      fetchCandidates();
      if (userRole === 'Partner') {
        fetchAuditLogs();
      }
    }
  }, [isLoggedIn]);

  const handleLogin = (e) => {
    e.preventDefault();
    const cleanEmail = loginEmail.trim().toLowerCase();

    if (selectedRoleType === 'Partner') {
      if (partnerEmails.includes(cleanEmail) && loginPassword === 'Inteca@1100145') {
        setUserRole('Partner');
        setIsLoggedIn(true);
      } else {
        alert('Invalid Credentials');
      }
    } else {
      const hrRecord = hrDatabase[cleanEmail];
      if (hrRecord && hrRecord.password === loginPassword) {
        setUserRole('HR');
        setIsLoggedIn(true);
        setFormData(prev => ({ ...prev, recruiter: hrRecord.name }));
      } else {
        alert('Invalid Credentials');
      }
    }
  };

  const fetchCandidates = async () => {
    let query = supabase.from('candidates').select('*');
    const { data, error } = await query.order('joining_date', { ascending: false });

    if (error) {
      console.error("Fetch Error:", error);
    }

    if (data) {
      const today = new Date();
      const updated = data.map((item) => {
        let diffDays = 0;
        if (item.joining_date && item.status === 'Joined') {
          const joinDate = new Date(item.joining_date);
          diffDays = Math.ceil(Math.abs(today - joinDate) / (1000 * 60 * 60 * 24));
        }
        
        let currentInvoiceStatus = item.invoice_status;
        if (item.status === 'Dropped' || item.status === 'Rejected') {
          currentInvoiceStatus = 'Cancelled';
        } else if (diffDays > 90 && currentInvoiceStatus === 'Pending') {
          currentInvoiceStatus = 'Ready to Invoice';
        }

        return {
          ...item,
          invoice_status: currentInvoiceStatus
        };
      });
      setCandidates(updated);
    }
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase.from('audit_logs').select('*').order('action_timestamp', { ascending: false });
    if (!error && data) {
      setAuditLogs(data);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();

    const loggedInHRName = userRole === 'HR' ? hrDatabase[loginEmail.trim().toLowerCase()]?.name : '';
    let finalRecruiter = userRole === 'HR' ? loggedInHRName : (isOtherSelected ? otherRecruiterInput.trim() : formData.recruiter);
    
    if (!finalRecruiter) {
      alert("Please select or enter the Internal HR name.");
      return;
    }

    let updatedInvoiceStatus = formData.invoice_status;
    if (formData.status === 'Dropped' || formData.status === 'Rejected') {
      updatedInvoiceStatus = 'Cancelled';
    }

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      company_name: formData.company_name,
      process_name: formData.process_name,
      client_poc: formData.client_poc || '',
      selection_date: formData.selection_date || null,
      joining_date: formData.joining_date || null,
      recruiter: finalRecruiter,
      status: formData.status,
      revenue: userRole === 'HR' ? 0 : (parseFloat(formData.revenue) || 0),
      invoice_status: updatedInvoiceStatus,
      invoice_number: formData.invoice_number || '',
      payment_date: formData.payment_date || null,
      payment_mode: formData.payment_mode,
      notes: formData.notes || ''
    };

    setPendingAction({
      type: isEditing ? 'EDIT' : 'ADD',
      payload: payload,
      message: isEditing ? `Update details for "${formData.name}"?` : `Add candidate "${formData.name}"?`
    });
  };

  const executeConfirmedAction = async () => {
    if (!pendingAction) return;
    const { type, payload } = pendingAction;

    if (type === 'ADD' || type === 'EDIT') {
      let response = type === 'EDIT' && currentId
        ? await supabase.from('candidates').update(payload).eq('id', currentId)
        : await supabase.from('candidates').insert([payload]);

      if (response && response.error) {
        alert("Failed to save: " + response.error.message);
      } else {
        alert(type === 'EDIT' ? "Updated successfully!" : "Added successfully!");
        setFormData({ 
          name: '', email: '', phone: '', recruiter: userRole === 'HR' ? (hrDatabase[loginEmail.trim().toLowerCase()]?.name) : '', 
          company_name: '', process_name: '', client_poc: '', selection_date: '', joining_date: '', 
          revenue: '', status: 'Yet to Join', invoice_status: 'Pending', invoice_number: '', 
          payment_date: '', payment_mode: 'NEFT', notes: ''
        });
        setIsEditing(false);
        setCurrentId(null);
        fetchCandidates();
      }
    } else if (type === 'DELETE') {
      const { error } = await supabase.from('candidates').delete().eq('id', pendingAction.candidate.id);
      if (!error) {
        alert("Deleted successfully!");
        fetchCandidates();
      }
    }
    setPendingAction(null);
  };

  // AI Floating Chat Submission with Role-Based Security Filter & Simple English Output
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    const currentHRName = userRole === 'HR' ? hrDatabase[loginEmail.trim().toLowerCase()]?.name : '';

    // Prepare database context based on role security permissions
    let contextData = '';
    if (userRole === 'Partner') {
      contextData = JSON.stringify(candidates.map(c => ({
        name: c.name, company: c.company_name, hr: c.recruiter, status: c.status, revenue: c.revenue, notes: c.notes
      })));
    } else {
      // Strict Security Filter for HR: Only include candidates submitted by this specific HR
      const hrOnlyCandidates = candidates.filter(c => c.recruiter?.trim() === currentHRName);
      contextData = JSON.stringify(hrOnlyCandidates.map(c => ({
        name: c.name, company: c.company_name, status: c.status, notes: c.notes
      })));
    }

    let systemInstruction = '';
    if (userRole === 'Partner') {
      systemInstruction = `You are an AI assistant for Omne JobGiants Partners. You have access to all company data. Answer questions about all HRs' performance, individual comparisons, lagging areas, and interview failure/rejection reasons in simple, clear English language so everyone can understand easily. Database: ${contextData}`;
    } else {
      systemInstruction = `You are an AI assistant for HR ${currentHRName}. STRICT SECURITY RULE: This user is an HR. They can ONLY ask about their own performance, weak areas, and improvement tips based on their personal candidate submissions. If they ask about other HRs or general company data, politely deny. Always answer in simple, clear English language. Their Data: ${contextData}`;
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemInstruction}\n\nUser Question: ${userMsg}` }]
          }]
        })
      });

      const data = await response.json();
      if (data.candidates && data.candidates.length > 0) {
        const reply = data.candidates[0].content.parts[0].text;
        setChatMessages(prev => [...prev, { sender: 'ai', text: reply }]);
      } else {
        setChatMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, I could not process your request right now.' }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Error connecting to AI assistant.' }]);
    }
    setChatLoading(false);
  };

  const currentLoggedInHRName = userRole === 'HR' ? hrDatabase[loginEmail.trim().toLowerCase()]?.name : '';

  const filteredCandidates = candidates.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||  
      item.recruiter.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.company_name && item.company_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStage = filterStage === 'All' || item.status === filterStage;
    const matchesHR = userRole === 'HR' ? item.recruiter === currentLoggedInHRName : (filterHR === 'All' || item.recruiter === filterHR);

    return matchesSearch && matchesStage && matchesHR;
  });

  const totalRevenue = candidates
    .filter(item => item.status !== 'Dropped' && item.status !== 'Rejected')
    .reduce((acc, curr) => acc + (parseFloat(curr.revenue) || 0), 0);

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'Inter, sans-serif', padding: '16px' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
          <img src={companyLogo} alt="Logo" style={{ width: '55px', height: '55px', objectFit: 'contain', marginBottom: '12px' }} />
          <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Omne JobGiants India Private Limited</h2>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>Enter your official credentials</p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '14px', textAlign: 'left' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Login As</label>
              <select value={selectedRoleType} onChange={(e) => setSelectedRoleType(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', fontWeight: '600' }}>
                <option value="Partner">👑 Partner / Management</option>
                <option value="HR">👤 Internal HR Team</option>
              </select>
            </div>

            <div style={{ marginBottom: '14px', textAlign: 'left' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Email Address</label>
              <input type="email" placeholder="Enter email..." value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '18px', textAlign: 'left' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Password</label>
              <input type="password" placeholder="Enter password..." value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
            </div>

            <button type="submit" style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              Login to Portal 🚀
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', padding: '12px', fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#f1f5f9', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Navbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#fff', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={companyLogo} alt="Logo" style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '50%' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>Omne JobGiants India Private Limited</h1>
              <span style={{ fontSize: '11px', color: '#64748b' }}>{userRole === 'Partner' ? 'Partner CRM' : `HR Portal • ${currentLoggedInHRName}`}</span>
            </div>
          </div>
          <button onClick={() => setIsLoggedIn(false)} style={{ padding: '7px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
            🔒 Logout
          </button>
        </div>

        {/* Dashboard Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.8fr', gap: '20px' }}>
          
          {/* Form Section */}
          <div style={{ background: '#fff', padding: '18px', borderRadius: '16px', height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              {isEditing ? '✏️ Edit Candidate' : '➕ Add Candidate'}
            </h3>
            <form onSubmit={handleFormSubmit}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Candidate Name *</label>
                <input type="text" placeholder="Full name..." value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Company Name *</label>
                <select value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} required style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                  <option value="">Select Company...</option>
                  {predefinedCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {userRole === 'Partner' && (
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Internal HR *</label>
                  <select value={formData.recruiter} onChange={(e) => setFormData({ ...formData, recruiter: e.target.value })} required style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                    <option value="">Select HR...</option>
                    {predefinedHRs.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                  <option value="Yet to Join">Yet to Join</option>
                  <option value="Joined">Joined</option>
                  <option value="Dropped">Dropped</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Notes / Rejection Reason</label>
                <textarea placeholder="Add notes or reason..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="2" style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>

              <button type="submit" style={{ width: '100%', padding: '9px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                {isEditing ? 'Update Candidate' : 'Save Candidate'}
              </button>
            </form>
          </div>

          {/* Table Section */}
          <div style={{ background: '#fff', padding: '18px', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Candidates Database</h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '8px' }}>Name</th>
                    <th style={{ padding: '8px' }}>Company</th>
                    <th style={{ padding: '8px' }}>HR</th>
                    <th style={{ padding: '8px' }}>Status</th>
                    <th style={{ padding: '8px' }}>Notes / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>No candidates found.</td></tr>
                  ) : (
                    filteredCandidates.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', fontWeight: '600' }}>{item.name}</td>
                        <td style={{ padding: '8px' }}>{item.company_name}</td>
                        <td style={{ padding: '8px' }}>{item.recruiter}</td>
                        <td style={{ padding: '8px' }}>{item.status}</td>
                        <td style={{ padding: '8px', color: '#64748b' }}>{item.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* AUTOMATED FLOATING CHAT WIDGET */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
        {!isChatOpen ? (
          <button 
            onClick={() => setIsChatOpen(true)}
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', border: 'none', borderRadius: '50px', padding: '12px 20px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            🤖 AI Assistant
          </button>
        ) : (
          <div style={{ width: '340px', height: '450px', background: '#fff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            
            {/* Chat Header */}
            <div style={{ background: '#4f46e5', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', fontSize: '13px' }}>
              <span>🤖 JobGiants AI Helper</span>
              <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Chat Messages Body */}
            <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8fafc', fontSize: '12px' }}>
              {chatMessages.map((msg, index) => (
                <div key={index} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', background: msg.sender === 'user' ? '#4f46e5' : '#e2e8f0', color: msg.sender === 'user' ? '#fff' : '#1e293b', padding: '8px 12px', borderRadius: '10px', maxWidth: '80%', lineHeight: '1.4' }}>
                  {msg.text}
                </div>
              ))}
              {chatLoading && <div style={{ alignSelf: 'flex-start', color: '#64748b', fontStyle: 'italic', fontSize: '11px' }}>AI is thinking...</div>}
            </div>

            {/* Chat Input Footer */}
            <form onSubmit={handleSendChatMessage} style={{ display: 'flex', padding: '8px', background: '#fff', borderTop: '1px solid #cbd5e1' }}>
              <input 
                type="text" 
                placeholder={userRole === 'Partner' ? "Ask anything about HRs, rejections..." : "Ask about your performance..."} 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
              />
              <button type="submit" style={{ marginLeft: '6px', padding: '8px 12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Send</button>
            </form>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {pendingAction && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Confirm Action</h3>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>{pendingAction.message}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={executeConfirmedAction} style={{ flex: 1, padding: '9px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Confirm</button>
              <button onClick={() => setPendingAction(null)} style={{ flex: 1, padding: '9px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
