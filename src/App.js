import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://okreuewrtorwkyidoawx.supabase.co/';
const SUPABASE_ANON_KEY = 'sb_publishable_Iznkoy_uNvS3-dqziX6KYQ_tKS6mvb0';

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
  
  // Confirmation Modal State for Add, Edit, Delete
  const [pendingAction, setPendingAction] = useState(null); // { type: 'ADD' | 'EDIT' | 'DELETE', data: ..., message: '...' }

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

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
  
  const [selectedReportMonth, setSelectedReportMonth] = useState('All');
  const [hrSelectedReportMonth, setHrSelectedReportMonth] = useState('All');
  
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [paymentModalCandidate, setPaymentModalCandidate] = useState(null);
  const [paymentDateInput, setPaymentDateInput] = useState('');
  const [paymentModeInput, setPaymentModeInput] = useState('NEFT');

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedForBatchInvoice, setSelectedForBatchInvoice] = useState([]);
  const [batchInvoiceNumber, setBatchInvoiceNumber] = useState('');

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

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Image = event.target.result;
      setCompanyLogo(base64Image);
      localStorage.setItem('crm_custom_logo', base64Image);
      alert("Logo successfully updated!");
    };
    reader.readAsDataURL(file);
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

    const cleanSelectionDate = formData.selection_date && formData.selection_date.trim() !== '' ? formData.selection_date : null;
    const cleanJoiningDate = formData.joining_date && formData.joining_date.trim() !== '' ? formData.joining_date : null;
    const cleanPaymentDate = formData.payment_date && formData.payment_date.trim() !== '' ? formData.payment_date : null;

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      company_name: formData.company_name,
      process_name: formData.process_name,
      client_poc: formData.client_poc || '',
      selection_date: cleanSelectionDate,
      joining_date: cleanJoiningDate,
      recruiter: finalRecruiter,
      status: formData.status,
      revenue: userRole === 'HR' ? 0 : (parseFloat(formData.revenue) || 0),
      invoice_status: updatedInvoiceStatus,
      invoice_number: formData.invoice_number || '',
      payment_date: cleanPaymentDate,
      payment_mode: formData.payment_mode,
      notes: formData.notes || ''
    };

    const actionType = isEditing ? 'EDIT' : 'ADD';
    const message = isEditing 
      ? `Are you sure you want to update the details for candidate "${formData.name}"?` 
      : `Are you sure you want to add candidate "${formData.name}"?`;

    setPendingAction({
      type: actionType,
      payload: payload,
      message: message
    });
  };

  const executeConfirmedAction = async () => {
    if (!pendingAction) return;
    const { type, payload } = pendingAction;

    if (type === 'ADD' || type === 'EDIT') {
      let response;
      if (type === 'EDIT' && currentId) {
        response = await supabase.from('candidates').update(payload).eq('id', currentId);
      } else {
        response = await supabase.from('candidates').insert([payload]);
      }

      if (response && response.error) {
        console.error("Supabase Save Error:", response.error);
        alert("Failed to save: " + response.error.message);
      } else {
        if (userRole === 'Partner' && type === 'EDIT') {
          const nowObj = new Date();
          const logPayload = {
            partner_email: loginEmail.trim().toLowerCase(),
            action_type: 'EDIT',
            candidate_name: payload.name,
            candidate_company: payload.company_name || 'N/A',
            action_timestamp: nowObj.toISOString()
          };
          await supabase.from('audit_logs').insert([logPayload]);
          fetchAuditLogs();
        }

        alert(type === 'EDIT' ? "Candidate successfully updated!" : "Candidate successfully added!");
        setFormData({ 
          name: '', email: '', phone: '', recruiter: userRole === 'HR' ? (hrDatabase[loginEmail.trim().toLowerCase()]?.name) : '', 
          company_name: '', process_name: '', client_poc: '', selection_date: '', joining_date: '', 
          revenue: '', status: 'Yet to Join', invoice_status: 'Pending', invoice_number: '', 
          payment_date: '', payment_mode: 'NEFT', notes: ''
        });
        setIsOtherSelected(false);
        setOtherRecruiterInput('');
        setIsEditing(false);
        setCurrentId(null);
        fetchCandidates();
      }
    } else if (type === 'DELETE') {
      const candidate = pendingAction.candidate;
      const { error } = await supabase.from('candidates').delete().eq('id', candidate.id);
      if (error) {
        alert("Failed to delete: " + error.message);
      } else {
        if (userRole === 'Partner') {
          const nowObj = new Date();
          const logPayload = {
            partner_email: loginEmail.trim().toLowerCase(),
            action_type: 'DELETE',
            candidate_name: candidate.name,
            candidate_company: candidate.company_name || 'N/A',
            action_timestamp: nowObj.toISOString()
          };
          await supabase.from('audit_logs').insert([logPayload]);
          fetchAuditLogs();
        }

        alert("Candidate successfully deleted!");
        fetchCandidates();
      }
    }

    setPendingAction(null);
  };

  const handleMarkAsPaidSubmit = async (e) => {
    e.preventDefault();
    if (!paymentModalCandidate) return;

    const payload = {
      invoice_status: 'Paid',
      payment_date: paymentDateInput || new Date().toISOString().split('T')[0],
      payment_mode: paymentModeInput
    };

    const { error } = await supabase.from('candidates').update(payload).eq('id', paymentModalCandidate.id);

    if (error) {
      alert("Error updating payment: " + error.message);
    } else {
      alert("Invoice successfully marked as Paid!");
      setPaymentModalCandidate(null);
      setPaymentDateInput('');
      fetchCandidates();
    }
  };

  const handleBatchInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!batchInvoiceNumber.trim()) {
      alert("Please enter a valid Invoice Number.");
      return;
    }
    if (selectedForBatchInvoice.length === 0) {
      alert("Please select at least one candidate.");
      return;
    }

    const { error } = await supabase
      .from('candidates')
      .update({ 
        invoice_status: 'Invoice Raised / Pending Clearance',
        invoice_number: batchInvoiceNumber.trim()
      })
      .in('id', selectedForBatchInvoice);

    if (error) {
      alert("Error updating batch invoice: " + error.message);
    } else {
      alert(`Invoice ${batchInvoiceNumber} successfully generated for selected candidates!`);
      setShowInvoiceModal(false);
      setBatchInvoiceNumber('');
      setSelectedForBatchInvoice([]);
      fetchCandidates();
    }
  };

  const handleDeleteCandidate = (candidate, itemCreationDate) => {
    if (userRole === 'HR' && itemCreationDate) {
      const entryDate = new Date(itemCreationDate);
      const today = new Date();
      const diffTime = Math.abs(today - entryDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 90) {
        alert("You can only edit or delete entries created within the last 90 days.");
        return;
      }
    }

    setPendingAction({
      type: 'DELETE',
      candidate: candidate,
      message: `Are you sure you want to delete candidate "${candidate.name}"?`
    });
  };

  const handleEditClick = (item) => {
    if (userRole === 'HR' && item.created_at) {
      const entryDate = new Date(item.created_at);
      const today = new Date();
      const diffTime = Math.abs(today - entryDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 90) {
        alert("You can only edit or delete entries created within the last 90 days.");
        return;
      }
    }

    setIsEditing(true);
    setCurrentId(item.id);
    setFormData(item);
    setIsOtherSelected(false);
  };

  const downloadSampleCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "name,email,phone,company_name,process_name,client_poc,recruiter,selection_date,joining_date,revenue,status,notes\n"
      + "Rahul Sharma,rahul@email.com,9876543210,Transom,US Voice,Mr. Ramesh,Sanchi,2026-10-01,2026-10-15,35000,Joined,Joining confirmed\n"
      + "Priya Singh,priya@email.com,9123456789,HGS,Backend,Ms. Pooja,Sadaf,2026-10-05,2026-10-20,25000,Yet to Join,Called on Monday";
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "JobGiants_Candidate_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const loggedInHRName = userRole === 'HR' ? hrDatabase[loginEmail.trim().toLowerCase()]?.name : '';

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split('\n').map(row => row.split(',').map(val => val.trim()));
      const headers = rows[0].map(h => h.toLowerCase().replace(/['"]+/g, ''));

      const batchData = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < headers.length || !row[0]) continue;

        let obj = {};
        headers.forEach((h, index) => {
          let val = row[index] ? row[index].replace(/['"]+/g, '') : '';
          if (h === 'revenue') val = parseFloat(val) || 0;
          obj[h] = val;
        });

        const statusVal = obj.status || 'Yet to Join';
        const invStatus = (statusVal === 'Dropped' || statusVal === 'Rejected') ? 'Cancelled' : 'Pending';
        const rowRecruiter = userRole === 'HR' ? loggedInHRName : (obj.recruiter ? obj.recruiter.trim() : 'Sanchi');

        batchData.push({
          name: obj.name || 'Unknown',
          email: obj.email || '',
          phone: obj.phone || '',
          company_name: obj.company_name || 'Transom',
          process_name: obj.process_name || 'General',
          client_poc: obj.client_poc || '',
          recruiter: rowRecruiter,
          selection_date: obj.selection_date || null,
          joining_date: obj.joining_date || null,
          revenue: userRole === 'HR' ? 0 : (obj.revenue || 0),
          status: statusVal,
          invoice_status: invStatus,
          notes: obj.notes || ''
        });
      }

      if (batchData.length > 0) {
        const { error } = await supabase.from('candidates').insert(batchData);
        if (error) {
          alert("Bulk upload error: " + error.message);
        } else {
          alert(`Successfully uploaded ${batchData.length} candidates!`);
          fetchCandidates();
        }
      } else {
        alert("No valid data found in file or incorrect format.");
      }
    };
    reader.readAsText(file);
  };

  const handleAiAsk = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    setAiResponse('');
    try {
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY || 'AQ.Ab8RN6KbUwgs8ZZTFKCNqJa3TzJtTuF9_SmPlBZIdLaYpM3l8Q';
      const summaryContext = `Total Candidates: ${candidates.length}. Total Revenue: ${totalRevenue}.`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `You are an AI Assistant for Omne JobGiants CRM. Context: ${summaryContext}. Question: ${aiPrompt}` }] }]
        })
      });
      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
      setAiResponse(reply);
    } catch (err) {
      setAiResponse("Error communicating with Gemini AI.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const sendMonthlyReportEmail = () => {
    const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const totalRev = candidates.filter(item => item.status !== 'Dropped' && item.status !== 'Rejected').reduce((acc, curr) => acc + (parseFloat(curr.revenue) || 0), 0);
    const totalJoined = candidates.filter(item => item.status === 'Joined').length;
    const totalDropped = candidates.filter(item => item.status === 'Dropped' || item.status === 'Rejected').length;

    let emailBody = `OMNE JOBGIANTS CONSULTANCY - MONTHLY REPORT\n`;
    emailBody = emailBody + `Month: ${currentMonthName}\n`;
    emailBody = emailBody + `========================================\n`;
    emailBody = emailBody + `Total Active Revenue: Rs. ${totalRev.toLocaleString('en-IN')}\n`;
    emailBody = emailBody + `Total Joined Candidates: ${totalJoined}\n`;
    emailBody = emailBody + `Total Dropped/Rejected: ${totalDropped}\n`;
    emailBody = emailBody + `========================================\n\n`;
    emailBody = emailBody + `CANDIDATES LIST SUMMARY:\n`;

    candidates.forEach((c, idx) => {
      emailBody = emailBody + `${idx + 1}. ${c.name} | Company: ${c.company_name || 'N/A'} | HR: ${c.recruiter} | Rev: Rs. ${parseFloat(c.revenue || 0).toLocaleString('en-IN')} | Status: ${c.status} | Invoice: ${c.invoice_status}\n`;
    });

    const recipientTo = 'Jobgiants1@gmail.com';
    const recipientCc = 'suraj.jha@jobgiants.in,garimabansal@jobgiants.in';
    const subject = encodeURIComponent(`Monthly Recruitment Report - ${currentMonthName} [JobGiants CRM]`);
    const body = encodeURIComponent(emailBody);

    const gmailWebLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipientTo}&cc=${recipientCc}&su=${subject}&body=${body}`;
    window.open(gmailWebLink, '_blank');
  };

  const hrEmailDirectory = {
    'Sanchi': 'sanchi.aggarwal@jobgiants.in',
    'Sadaf': 'sadaf.kazi@jobgiants.in',
    'Anjali': 'anjali.srivastava@jobgiants.in'
  };

  const sendHRPerformanceEmail = (hrName, monthKey, hrData) => {
    const hrEmail = hrEmailDirectory[hrName] || '';
    if (!hrEmail) {
      alert(`Please configure a valid email address for ${hrName}.`);
      return;
    }

    const hrCandidates = candidates.filter(item => {
      const dateToUse = item.joining_date || item.selection_date;
      if (!dateToUse) return false;
      const dateObj = new Date(dateToUse);
      const mKey = isNaN(dateObj) ? 'Unknown' : dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
      return item.recruiter?.trim() === hrName && mKey === monthKey;
    });

    let emailBody = `Hi ${hrName},\n\n`;
    emailBody += `Here is your monthly performance report for ${monthKey} at Omne JobGiants Consultancy:\n\n`;
    emailBody += `----------------------------------------\n`;
    emailBody += `SUMMARY:\n`;
    emailBody += `• Total Selections / Candidates Handled: ${hrCandidates.length}\n`;
    emailBody += `• Total Successful Joinings: ${hrData.joined}\n`;
    emailBody += `• Total Drops / Rejections: ${hrData.dropped}\n`;
    emailBody += `----------------------------------------\n\n`;
    emailBody += `DETAILED CANDIDATE LIST:\n`;

    hrCandidates.forEach((c, idx) => {
      emailBody += `${idx + 1}. Candidate: ${c.name} | Company: ${c.company_name || 'N/A'} | Process: ${c.process_name || 'N/A'} | Status: ${c.status}\n`;
    });

    emailBody += `\nKeep up the great work!\n\nBest Regards,\nOmne JobGiants Management`;

    const recipientTo = hrEmail;
    const recipientCc = 'suraj.jha@jobgiants.in,garimabansal@jobgiants.in';
    const subject = encodeURIComponent(`Your Monthly Performance Report - ${monthKey} [JobGiants]`);
    const body = encodeURIComponent(emailBody);

    const gmailWebLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipientTo}&cc=${recipientCc}&su=${subject}&body=${body}`;
    window.open(gmailWebLink, '_blank');
  };

  const allRecruiters = Array.from(new Set([...predefinedHRs, ...candidates.map(item => item.recruiter)])).filter(Boolean);
  const readyToInvoiceList = candidates.filter(item => item.invoice_status === 'Ready to Invoice');
  const pendingInvoicesList = candidates.filter(item => item.invoice_status === 'Invoice Raised / Pending Clearance');

  const totalRevenue = candidates
    .filter(item => (filterHR === 'All' || item.recruiter === filterHR))
    .filter(item => item.status !== 'Dropped' && item.status !== 'Rejected')
    .reduce((acc, curr) => acc + (parseFloat(curr.revenue) || 0), 0);
  
  const lateralHiringCount = candidates
    .filter(item => (filterHR === 'All' || item.recruiter === filterHR))
    .filter(item => item.status !== 'Dropped' && item.status !== 'Rejected' && parseFloat(item.revenue || 0) >= 30000).length;

  const currentLoggedInHRName = userRole === 'HR' ? hrDatabase[loginEmail.trim().toLowerCase()]?.name : '';

  const filteredCandidates = candidates.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||  
      item.recruiter.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.company_name && item.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.process_name && item.process_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.client_poc && item.client_poc.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.phone && item.phone.includes(searchTerm));
    
    const matchesStatus = filterInvoiceStatus === 'All' || item.invoice_status === filterInvoiceStatus;
    const matchesStage = filterStage === 'All' || item.status === filterStage;
    const matchesHR = userRole === 'HR' ? item.recruiter === currentLoggedInHRName : (filterHR === 'All' || item.recruiter === filterHR);

    return matchesSearch && matchesStatus && matchesStage && matchesHR;
  });

  const hrCandidatesList = candidates.filter(item => userRole === 'HR' && item.recruiter === currentLoggedInHRName);
  const hrMonthlyBreakdown = {};
  hrCandidatesList.forEach(item => {
    const dateToUse = item.joining_date || item.selection_date;
    if (!dateToUse) return;
    const dateObj = new Date(dateToUse);
    const monthKey = isNaN(dateObj) ? 'Unknown' : dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

    if (!hrMonthlyBreakdown[monthKey]) {
      hrMonthlyBreakdown[monthKey] = {
        total: 0, selected: 0, joined: 0, dropped: 0, rejected: 0, yetToJoin: 0, candidates: []
      };
    }

    hrMonthlyBreakdown[monthKey].total += 1;
    hrMonthlyBreakdown[monthKey].candidates.push(item);

    if (item.status === 'Selected') hrMonthlyBreakdown[monthKey].selected += 1;
    else if (item.status === 'Joined') hrMonthlyBreakdown[monthKey].joined += 1;
    else if (item.status === 'Dropped') hrMonthlyBreakdown[monthKey].dropped += 1;
    else if (item.status === 'Rejected') hrMonthlyBreakdown[monthKey].rejected += 1;
    else if (item.status === 'Yet to Join') hrMonthlyBreakdown[monthKey].yetToJoin += 1;
  });

  const monthlyData = {};
  candidates.forEach(item => {
    const dateToUse = item.joining_date || item.selection_date;
    if (!dateToUse) return;
    const dateObj = new Date(dateToUse);
    const monthKey = isNaN(dateObj) ? 'Unknown' : dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { totalRevenue: 0, joinedCount: 0, droppedCount: 0, recruiters: {} };
    }

    const rev = parseFloat(item.revenue) || 0;
    const recName = item.recruiter ? item.recruiter.trim() : 'Unassigned';

    if (!monthlyData[monthKey].recruiters[recName]) {
      monthlyData[monthKey].recruiters[recName] = { joined: 0, dropped: 0, revenue: 0 };
    }

    if (item.status !== 'Dropped' && item.status !== 'Rejected') {
      monthlyData[monthKey].totalRevenue += rev;
      monthlyData[monthKey].recruiters[recName].revenue += rev;
    }

    if (item.status === 'Joined' || item.status === 'Selected') {
      monthlyData[monthKey].joinedCount += 1;
      monthlyData[monthKey].recruiters[recName].joined += 1;
    } else if (item.status === 'Dropped' || item.status === 'Rejected') {
      monthlyData[monthKey].droppedCount += 1;
      monthlyData[monthKey].recruiters[recName].dropped += 1;
    }
  });

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'Inter, sans-serif', padding: '16px' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
          <img src={companyLogo} alt="Logo" style={{ width: '55px', height: '55px', objectFit: 'contain', marginBottom: '12px' }} />
          <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Omne JobGiants Portal</h2>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>Enter your official email & password</p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '14px', textAlign: 'left' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Login As</label>
              <select 
                value={selectedRoleType} 
                onChange={(e) => setSelectedRoleType(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', fontWeight: '600' }}
              >
                <option value="Partner">👑 Partner / Management</option>
                <option value="HR">👤 Internal HR Team</option>
              </select>
            </div>

            <div style={{ marginBottom: '14px', textAlign: 'left' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Email Address</label>
              <input 
                type="email" 
                placeholder={selectedRoleType === 'Partner' ? 'suraj.jha@jobgiants.in' : 'sanchi.aggarwal@jobgiants.in'} 
                value={loginEmail} 
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '18px', textAlign: 'left' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Password</label>
              <input 
                type="password" 
                placeholder="Enter password..." 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
              />
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
    <div style={{ position: 'relative', padding: '12px', fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#f1f5f9', minHeight: '100vh', overflowX: 'hidden', boxSizing: 'border-box' }}>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        .animated-container { animation: fadeIn 0.35s ease-out forwards; }
        .animated-modal { animation: zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .invoice-alert { animation: pulseGlow 2s infinite; }
        .glass-card { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px); border: 1px solid rgba(226, 232, 240, 0.8); }
        .modern-input { transition: all 0.2s ease; }
        .modern-input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important; outline: none; }
        button { transition: all 0.2s ease; }
        button:hover { filter: brightness(1.05); transform: translateY(-1px); }
        button:active { transform: translateY(0); }
        tr.hover-effect:hover { background-color: #f8fafc !important; }

        .responsive-grid { display: grid; grid-template-columns: 1fr 2.8fr; gap: 20px; }
        .responsive-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .desktop-table-view { display: block; }
        .mobile-card-view { display: none; }

        @media (max-width: 900px) {
          .responsive-grid { grid-template-columns: 1fr !important; }
          .responsive-stats { grid-template-columns: 1fr !important; }
          .desktop-table-view { display: none !important; }
          .mobile-card-view { display: block !important; }
        }
      `}</style>

      {/* Background Watermark Logo */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '350px', height: '350px', backgroundImage: `url("${companyLogo}")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: 'contain',
        opacity: 0.03, zIndex: 0, pointerEvents: 'none'
      }} />

      <div className="animated-container" style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Navbar */}
        <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '3px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', borderRadius: '50%', display: 'flex' }}>
              <img src={companyLogo} alt="Logo" style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', background: 'linear-gradient(to right, #1e293b, #475569)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Omne JobGiants India Private Limited
              </h1>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                {userRole === 'Partner' ? '👑 Partner / Management Portal' : `👤 Recruiter Portal (${currentLoggedInHRName})`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {userRole === 'Partner' && (
              <>
                <button onClick={() => setActiveTab('dashboard')} style={{ padding: '7px 14px', borderRadius: '8px', background: activeTab === 'dashboard' ? '#4f46e5' : '#e2e8f0', color: activeTab === 'dashboard' ? '#fff' : '#334155', border: 'none', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                  📊 Dashboard
                </button>
                <button onClick={() => setActiveTab('audit')} style={{ padding: '7px 14px', borderRadius: '8px', background: activeTab === 'audit' ? '#4f46e5' : '#e2e8f0', color: activeTab === 'audit' ? '#fff' : '#334155', border: 'none', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                  📝 Audit Logs
                </button>
                <button onClick={() => setActiveTab('ai')} style={{ padding: '7px 14px', borderRadius: '8px', background: activeTab === 'ai' ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : '#e2e8f0', color: activeTab === 'ai' ? '#fff' : '#334155', border: 'none', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                  ✨ AI Assistant
                </button>
              </>
            )}

            {userRole === 'HR' && (
              <button onClick={() => setActiveTab('dashboard')} style={{ padding: '7px 14px', borderRadius: '8px', background: '#4f46e5', color: '#fff', border: 'none', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                👤 My Performance & Entries
              </button>
            )}

            <button onClick={() => { setIsLoggedIn(false); setLoginPassword(''); }} style={{ padding: '7px 12px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', border: 'none', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
              Logout 🚪
            </button>
          </div>
        </div>

        {/* Audit Logs Tab */}
        {userRole === 'Partner' && activeTab === 'audit' && (
          <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>📝 Partner Audit Trail & Activity Log</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px' }}>Partner Email</th>
                    <th style={{ padding: '10px' }}>Action Type</th>
                    <th style={{ padding: '10px' }}>Candidate Name</th>
                    <th style={{ padding: '10px' }}>Company</th>
                    <th style={{ padding: '10px' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>No audit activity recorded yet.</td></tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px', fontWeight: '600' }}>{log.partner_email}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', backgroundColor: log.action_type === 'EDIT' ? '#fef3c7' : '#fee2e2', color: log.action_type === 'EDIT' ? '#b45309' : '#991b1b' }}>
                            {log.action_type}
                          </span>
                        </td>
                        <td style={{ padding: '10px', fontWeight: '600' }}>{log.candidate_name}</td>
                        <td style={{ padding: '10px' }}>{log.candidate_company}</td>
                        <td style={{ padding: '10px', color: '#64748b' }}>{new Date(log.action_timestamp).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI Assistant Tab */}
        {userRole === 'Partner' && activeTab === 'ai' && (
          <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>✨ Gemini AI Recruitment Assistant</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Ask questions about candidate hiring trends, revenues, recruiter performance, or generate custom summaries.</p>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <input 
                type="text" 
                placeholder="e.g. Which recruiter has the highest revenue this month?" 
                value={aiPrompt} 
                onChange={(e) => setAiPrompt(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <button onClick={handleAiAsk} disabled={isAiLoading} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                {isAiLoading ? 'Analyzing...' : 'Ask AI 🚀'}
              </button>
            </div>

            {aiResponse && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', fontSize: '13px', color: '#334155', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                <strong>🤖 AI Insight:</strong><br />{aiResponse}
              </div>
            )}
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* Quick Metrics Bar */}
            <div className="responsive-stats">
              <div className="glass-card" style={{ padding: '16px', borderRadius: '14px', borderLeft: '4px solid #6366f1' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Active Revenue ({userRole === 'HR' ? 'Hidden for HR' : 'Total'})</span>
                <h2 style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
                  {userRole === 'HR' ? '🔒 Restricted' : `₹ ${totalRevenue.toLocaleString('en-IN')}`}
                </h2>
              </div>
              <div className="glass-card" style={{ padding: '16px', borderRadius: '14px', borderLeft: '4px solid #10b981' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Lateral Selections (₹30k+ Rev)</span>
                <h2 style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{lateralHiringCount}</h2>
              </div>
            </div>

            <div className="responsive-grid">
              
              {/* Left Column: Add / Edit Form */}
              <div className="glass-card" style={{ padding: '18px', borderRadius: '16px', height: 'fit-content', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
                    {isEditing ? '✏️ Edit Candidate' : '➕ Add New Candidate'}
                  </h3>
                  {isEditing && (
                    <button onClick={() => { setIsEditing(false); setCurrentId(null); setFormData({ name: '', email: '', phone: '', recruiter: userRole === 'HR' ? hrDatabase[loginEmail.trim().toLowerCase()]?.name : '', company_name: '', process_name: '', client_poc: '', selection_date: '', joining_date: '', revenue: '', status: 'Yet to Join', invoice_status: 'Pending', invoice_number: '', payment_date: '', payment_mode: 'NEFT', notes: '' }); }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleFormSubmit}>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Candidate Name *</label>
                    <input type="text" placeholder="Full Name..." value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Email Address</label>
                    <input type="email" placeholder="candidate@email.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Phone Number</label>
                    <input type="text" placeholder="10-digit mobile number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Company Name *</label>
                    <select value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} required className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      <option value="">Select Company...</option>
                      {predefinedCompanies.map(comp => <option key={comp} value={comp}>{comp}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Process Name</label>
                    <input type="text" placeholder="e.g. US Voice, Chat, Backend..." value={formData.process_name} onChange={(e) => setFormData({...formData, process_name: e.target.value})} className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Client POC Name</label>
                    <input type="text" placeholder="Client HR / Manager Name..." value={formData.client_poc} onChange={(e) => setFormData({...formData, client_poc: e.target.value})} className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>

                  {userRole === 'Partner' && (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Recruiter *</label>
                      {!isOtherSelected ? (
                        <select value={formData.recruiter} onChange={(e) => {
                          if (e.target.value === 'OTHER_CUSTOM') {
                            setIsOtherSelected(true);
                            setFormData({...formData, recruiter: ''});
                          } else {
                            setFormData({...formData, recruiter: e.target.value});
                          }
                        }} required className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                          <option value="">Select Recruiter...</option>
                          {predefinedHRs.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                          <option value="OTHER_CUSTOM">+ Other / Add New</option>
                        </select>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input type="text" placeholder="Enter Recruiter Name..." value={otherRecruiterInput} onChange={(e) => setOtherRecruiterInput(e.target.value)} required className="modern-input" style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                          <button type="button" onClick={() => { setIsOtherSelected(false); setOtherRecruiterInput(''); }} style={{ padding: '6px 10px', background: '#cbd5e1', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Selection Date</label>
                      <input type="date" value={formData.selection_date} onChange={(e) => setFormData({...formData, selection_date: e.target.value})} className="modern-input" style={{ width: '100%', padding: '8px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Joining Date</label>
                      <input type="date" value={formData.joining_date} onChange={(e) => setFormData({...formData, joining_date: e.target.value})} className="modern-input" style={{ width: '100%', padding: '8px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  {userRole === 'Partner' && (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Revenue (₹)</label>
                      <input type="number" placeholder="e.g. 25000" value={formData.revenue} onChange={(e) => setFormData({...formData, revenue: e.target.value})} className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                    </div>
                  )}

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Candidate Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      <option value="Yet to Join">Yet to Join</option>
                      <option value="Selected">Selected</option>
                      <option value="Joined">Joined</option>
                      <option value="Dropped">Dropped</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Notes / Remarks</label>
                    <textarea placeholder="Add any comments or remarks..." value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows="2" className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>

                  <button type="submit" style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                    {isEditing ? 'Update Candidate Details 💾' : 'Save Candidate Record 🚀'}
                  </button>
                </form>
              </div>

              {/* Right Column: Search, Filters & Candidates Table */}
              <div>
                <div className="glass-card" style={{ padding: '16px', borderRadius: '16px', marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
                  <input type="text" placeholder="🔍 Search name, phone, email, company..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, minWidth: '220px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                  
                  <select value={filterInvoiceStatus} onChange={(e) => setFilterInvoiceStatus(e.target.value)} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                    <option value="All">All Invoices</option>
                    <option value="Pending">Pending</option>
                    <option value="Ready to Invoice">Ready to Invoice</option>
                    <option value="Invoice Raised / Pending Clearance">Invoice Raised</option>
                    <option value="Paid">Paid</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                    <option value="All">All Stages</option>
                    <option value="Yet to Join">Yet to Join</option>
                    <option value="Joined">Joined</option>
                    <option value="Dropped">Dropped</option>
                  </select>

                  {userRole === 'Partner' && (
                    <select value={filterHR} onChange={(e) => setFilterHR(e.target.value)} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                      <option value="All">All Recruiters</option>
                      {allRecruiters.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                    </select>
                  )}
                </div>

                {/* Bulk Actions Bar for Partner */}
                {userRole === 'Partner' && (
                  <div className="glass-card" style={{ padding: '12px 16px', borderRadius: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button onClick={downloadSampleCSV} style={{ padding: '7px 12px', borderRadius: '8px', background: '#e0e7ff', color: '#3730a3', border: 'none', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>
                        📥 Download CSV Template
                      </button>
                      <label style={{ padding: '7px 12px', borderRadius: '8px', background: '#d1fae5', color: '#065f46', border: 'none', fontWeight: '700', fontSize: '11px', cursor: 'pointer', display: 'inline-block' }}>
                        📤 Bulk Upload CSV
                        <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={sendMonthlyReportEmail} style={{ padding: '7px 12px', borderRadius: '8px', background: '#10b981', color: '#fff', border: 'none', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>
                        📧 Send Monthly Report Email
                      </button>
                      {readyToInvoiceList.length > 0 && (
                        <button onClick={() => setShowInvoiceModal(true)} className="invoice-alert" style={{ padding: '7px 12px', borderRadius: '8px', background: '#f59e0b', color: '#fff', border: 'none', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>
                          ⚡ Raise Batch Invoice ({readyToInvoiceList.length})
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Candidates List Table */}
                <div className="glass-card" style={{ padding: '16px', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        {userRole === 'Partner' && <th style={{ padding: '10px', width: '30px' }}>Select</th>}
                        <th style={{ padding: '10px' }}>Candidate & Contact</th>
                        <th style={{ padding: '10px' }}>Company & Process</th>
                        <th style={{ padding: '10px' }}>Recruiter</th>
                        <th style={{ padding: '10px' }}>Joining Date</th>
                        {userRole === 'Partner' && <th style={{ padding: '10px' }}>Revenue</th>}
                        <th style={{ padding: '10px' }}>Status</th>
                        <th style={{ padding: '10px' }}>Invoice</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.length === 0 ? (
                        <tr><td colSpan="9" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No candidate records found.</td></tr>
                      ) : (
                        filteredCandidates.map((item) => (
                          <tr key={item.id} className="hover-effect" style={{ borderBottom: '1px solid #e2e8f0' }}>
                            {userRole === 'Partner' && (
                              <td style={{ padding: '10px' }}>
                                {item.invoice_status === 'Ready to Invoice' && (
                                  <input 
                                    type="checkbox" 
                                    checked={selectedForBatchInvoice.includes(item.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedForBatchInvoice([...selectedForBatchInvoice, item.id]);
                                      } else {
                                        setSelectedForBatchInvoice(selectedForBatchInvoice.filter(id => id !== item.id));
                                      }
                                    }}
                                  />
                                )}
                              </td>
                            )}
                            <td style={{ padding: '10px' }}>
                              <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{item.phone || 'No phone'}</div>
                              <div style={{ fontSize: '10px', color: '#94a3b8' }}>{item.email}</div>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <div style={{ fontWeight: '600', color: '#334155' }}>{item.company_name}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{item.process_name || 'General'}</div>
                            </td>
                            <td style={{ padding: '10px', fontWeight: '600', color: '#4f46e5' }}>{item.recruiter}</td>
                            <td style={{ padding: '10px', color: '#334155' }}>{item.joining_date || 'N/A'}</td>
                            {userRole === 'Partner' && (
                              <td style={{ padding: '10px', fontWeight: '700', color: '#059669' }}>₹ {(parseFloat(item.revenue) || 0).toLocaleString('en-IN')}</td>
                            )}
                            <td style={{ padding: '10px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', backgroundColor: item.status === 'Joined' ? '#d1fae5' : item.status === 'Dropped' ? '#fee2e2' : '#fef3c7', color: item.status === 'Joined' ? '#065f46' : item.status === 'Dropped' ? '#991b1b' : '#b45309' }}>
                                {item.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', backgroundColor: item.invoice_status === 'Paid' ? '#d1fae5' : item.invoice_status === 'Ready to Invoice' ? '#fef3c7' : '#e2e8f0', color: item.invoice_status === 'Paid' ? '#065f46' : item.invoice_status === 'Ready to Invoice' ? '#b45309' : '#334155' }}>
                                {item.invoice_status}
                              </span>
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button onClick={() => handleEditClick(item)} style={{ padding: '4px 8px', background: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>Edit</button>
                                <button onClick={() => handleDeleteCandidate(item, item.created_at)} style={{ padding: '4px 8px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>Del</button>
                                {userRole === 'Partner' && item.invoice_status !== 'Paid' && (
                                  <button onClick={() => setPaymentModalCandidate(item)} style={{ padding: '4px 8px', background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>Paid</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          </>
        )}

      </div>

      {/* Confirmation Modal */}
      {pendingAction && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="animated-modal" style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '360px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>⚠️ Confirm Action</h3>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>{pendingAction.message}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setPendingAction(null)} style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={executeConfirmedAction} style={{ flex: 1, padding: '10px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Confirm Yes</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalCandidate && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="animated-modal" style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>💰 Mark Invoice as Paid</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Candidate: <strong>{paymentModalCandidate.name}</strong></p>
            
            <form onSubmit={handleMarkAsPaidSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Payment Date</label>
                <input type="date" value={paymentDateInput} onChange={(e) => setPaymentDateInput(e.target.value)} required style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Payment Mode</label>
                <select value={paymentModeInput} onChange={(e) => setPaymentModeInput(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}>
                  <option value="NEFT">NEFT</option>
                  <option value="IMPS">IMPS</option>
                  <option value="RTGS">RTGS</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setPaymentModalCandidate(null)} style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Mark Paid ✅</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Invoice Modal */}
      {showInvoiceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="animated-modal" style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>⚡ Raise Batch Invoice</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Selected Candidates for Invoicing: <strong>{selectedForBatchInvoice.length}</strong></p>
            
            <form onSubmit={handleBatchInvoiceSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Invoice Number *</label>
                <input type="text" placeholder="e.g. INV-2026-001" value={batchInvoiceNumber} onChange={(e) => setBatchInvoiceNumber(e.target.value)} required style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowInvoiceModal(false)} style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Generate Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
