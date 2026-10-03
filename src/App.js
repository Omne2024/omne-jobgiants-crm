import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://okreuewrtorwkyidoawx.supabase.co/';
const SUPABASE_ANON_KEY = 'sb_publishable_Iznkoy_uNvS3-dqziX6KYQ_tKS6mvb0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  // Authentication & Role States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('Partner'); // 'Partner' or 'HR'
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [selectedRoleType, setSelectedRoleType] = useState('Partner');

  const [candidates, setCandidates] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const [companyLogo, setCompanyLogo] = useState(() => {
    return localStorage.getItem('crm_custom_logo') || 'https://www.jobgiants.in/wp-content/uploads/2023/10/cropped-Logo-1.png';
  });
  
  const predefinedHRs = ['Sanchi', 'Sadaf', 'Anjali', 'Shrey'];
  const predefinedCompanies = ['Transom', 'HGS', 'iQor', 'Atain', 'Vertex Group', 'Shaadi.com', 'iEnergizer'];

  // HR Email & Password Mapping Database with exact passwords requested
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
      // HR Login
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

  const handleFormSubmit = async (e) => {
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

    let response;
    if (isEditing) {
      response = await supabase.from('candidates').update(payload).eq('id', currentId);
    } else {
      response = await supabase.from('candidates').insert([payload]);
    }

    if (response && response.error) {
      console.error("Supabase Save Error:", response.error);
      alert("Failed to save: " + response.error.message);
    } else {
      // If edited by Partner, log audit entry
      if (userRole === 'Partner' && isEditing) {
        const nowObj = new Date();
        const logPayload = {
          partner_email: loginEmail.trim().toLowerCase(),
          action_type: 'EDIT',
          candidate_name: formData.name,
          candidate_company: formData.company_name || 'N/A',
          action_timestamp: nowObj.toISOString()
        };
        await supabase.from('audit_logs').insert([logPayload]);
        fetchAuditLogs();
      }

      alert("Candidate successfully saved!");
      setFormData({ 
        name: '', 
        email: '',
        phone: '',
        recruiter: userRole === 'HR' ? loggedInHRName : '', 
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
      setIsOtherSelected(false);
      setOtherRecruiterInput('');
      setIsEditing(false);
      setCurrentId(null);
      fetchCandidates();
    }
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

  const handleDeleteCandidate = async (candidate, itemCreationDate) => {
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

    if (window.confirm(`Are you sure you want to delete candidate ${candidate.name}?`)) {
      const { error } = await supabase.from('candidates').delete().eq('id', candidate.id);
      if (error) {
        alert("Failed to delete: " + error.message);
      } else {
        // If deleted by Partner, record audit log entry instantly
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

        fetchCandidates();
      }
    }
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

  // HR specific monthly breakdown computation
  const hrCandidatesList = candidates.filter(item => userRole === 'HR' && item.recruiter === currentLoggedInHRName);
  const hrMonthlyBreakdown = {};
  hrCandidatesList.forEach(item => {
    const dateToUse = item.joining_date || item.selection_date;
    if (!dateToUse) return;
    const dateObj = new Date(dateToUse);
    const monthKey = isNaN(dateObj) ? 'Unknown' : dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

    if (!hrMonthlyBreakdown[monthKey]) {
      hrMonthlyBreakdown[monthKey] = {
        total: 0,
        selected: 0,
        joined: 0,
        dropped: 0,
        rejected: 0,
        yetToJoin: 0,
        candidates: []
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
      monthlyData[monthKey] = {
        totalRevenue: 0,
        joinedCount: 0,
        droppedCount: 0,
        recruiters: {}
      };
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

  // LOGIN SCREEN RENDER
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
        .animated-container {
          animation: fadeIn 0.35s ease-out forwards;
        }
        .animated-modal {
          animation: zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .invoice-alert {
          animation: pulseGlow 2s infinite;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(226, 232, 240, 0.8);
        }
        .modern-input {
          transition: all 0.2s ease;
        }
        .modern-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
          outline: none;
        }
        button {
          transition: all 0.2s ease;
        }
        button:hover {
          filter: brightness(1.05);
          transform: translateY(-1px);
        }
        button:active {
          transform: translateY(0);
        }
        tr.hover-effect:hover {
          background-color: #f8fafc !important;
        }

        .responsive-grid {
          display: grid;
          grid-template-columns: 1fr 2.8fr;
          gap: 20px;
        }
        .responsive-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .desktop-table-view {
          display: block;
        }
        .mobile-card-view {
          display: none;
        }

        @media (max-width: 900px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
          }
          .responsive-stats {
            grid-template-columns: 1fr !important;
          }
          .desktop-table-view {
            display: none !important;
          }
          .mobile-card-view {
            display: block !important;
          }
        }
      `}</style>

      {/* Background Watermark Logo */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '350px',
        height: '350px',
        backgroundImage: `url("${companyLogo}")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
        opacity: 0.03,
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div className="animated-container" style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Modern Header Navbar */}
        <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '3px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', borderRadius: '50%', display: 'flex' }}>
              <img src={companyLogo} alt="Logo" style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', background: 'linear-gradient(to right, #1e293b, #475569)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Omne JobGiants
              </h1>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                {userRole === 'Partner' ? 'Partner CRM' : `HR Portal • ${currentLoggedInHRName}`}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {userRole === 'Partner' && (
              <>
                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setFilterInvoiceStatus('Invoice Raised / Pending Clearance')}
                    style={{ 
                      background: pendingInvoicesList.length > 0 ? '#ef4444' : '#e2e8f0', 
                      color: pendingInvoicesList.length > 0 ? '#fff' : '#334155', 
                      border: 'none', 
                      padding: '7px 10px', 
                      borderRadius: '8px', 
                      fontSize: '11px', 
                      fontWeight: '700', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Pending Invoices Clearance Alert"
                  >
                    🔔 Pending ({pendingInvoicesList.length})
                  </button>
                </div>

                <button 
                  onClick={sendMonthlyReportEmail} 
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                >
                  📧 Report
                </button>

                <button 
                  onClick={downloadSampleCSV} 
                  style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                  title="Download Sample CSV Template"
                >
                  📥 CSV Template
                </button>

                <label style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'inline-block' }} title="Upload Bulk Candidates via CSV">
                  📂 Bulk Upload
                  <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>

                <label style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '7px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                  🖼 Logo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                </label>

                <div style={{ display: 'flex', background: '#e2e8f0', padding: '2px', borderRadius: '8px', gap: '2px' }}>
                  <button 
                    onClick={() => setActiveTab('dashboard')} 
                    style={{ padding: '6px 10px', background: activeTab === 'dashboard' ? '#fff' : 'transparent', color: activeTab === 'dashboard' ? '#0f172a' : '#64748b', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>
                    Dash
                  </button>
                  <button 
                    onClick={() => setActiveTab('reports')} 
                    style={{ padding: '6px 10px', background: activeTab === 'reports' ? '#fff' : 'transparent', color: activeTab === 'reports' ? '#0f172a' : '#64748b', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>
                    Reports
                  </button>
                  <button 
                    onClick={() => setActiveTab('audit')} 
                    style={{ padding: '6px 10px', background: activeTab === 'audit' ? '#fff' : 'transparent', color: activeTab === 'audit' ? '#0f172a' : '#64748b', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>
                    Audit History
                  </button>
                </div>
              </>
            )}

            {userRole === 'HR' && (
              <>
                <button 
                  onClick={downloadSampleCSV} 
                  style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                  title="Download Sample CSV Template"
                >
                  📥 CSV Template
                </button>

                <label style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'inline-block' }} title="Upload Bulk Candidates via CSV">
                  📂 Bulk Upload
                  <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>

                <div style={{ display: 'flex', background: '#e2e8f0', padding: '2px', borderRadius: '8px', gap: '2px' }}>
                  <button 
                    onClick={() => setActiveTab('dashboard')} 
                    style={{ padding: '6px 10px', background: activeTab === 'dashboard' ? '#fff' : 'transparent', color: activeTab === 'dashboard' ? '#0f172a' : '#64748b', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>
                    Dash
                  </button>
                  <button 
                    onClick={() => setActiveTab('reports')} 
                    style={{ padding: '6px 10px', background: activeTab === 'reports' ? '#fff' : 'transparent', color: activeTab === 'reports' ? '#0f172a' : '#64748b', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>
                    Reports
                  </button>
                </div>
              </>
            )}

            <button 
              onClick={() => setIsLoggedIn(false)} 
              style={{ background: '#64748b', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
            >
              🔒 Logout
            </button>
          </div>
        </div>

        {/* Ready to Invoice Alert Banner (Partner Only) */}
        {userRole === 'Partner' && readyToInvoiceList.length > 0 && (
          <div className="invoice-alert" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '1px solid #f59e0b', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>⚡</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#92400e' }}>
                {readyToInvoiceList.length} candidate(s) completed 90 days! Create group invoice number.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setShowInvoiceModal(true)} 
                style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                ➕ Create Invoice #
              </button>
              <button 
                onClick={() => setFilterInvoiceStatus('Ready to Invoice')} 
                style={{ background: '#d97706', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                Filter Ready
              </button>
            </div>
          </div>
        )}

        {/* AUDIT HISTORY TAB (Partner Only) */}
        {userRole === 'Partner' && activeTab === 'audit' ? (
          <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '16px', fontWeight: '800' }}>
              🛡️ Partner Portal Activity & Deletion Audit History
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
              This log tracks which partner email performed which action (edit or delete) on which candidate, along with the exact date and time.
            </p>

            {auditLogs.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px' }}>No deletion or edit action history recorded yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#475569', fontWeight: '700' }}>
                      <th style={{ padding: '10px' }}>Partner Email</th>
                      <th style={{ padding: '10px' }}>Action Type</th>
                      <th style={{ padding: '10px' }}>Candidate Name</th>
                      <th style={{ padding: '10px' }}>Company</th>
                      <th style={{ padding: '10px' }}>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => {
                      const dt = new Date(log.action_timestamp);
                      const formattedDate = isNaN(dt) ? log.action_timestamp : dt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' });
                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px', fontWeight: '700', color: '#4f46e5' }}>{log.partner_email}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '10px', fontWeight: '700', background: log.action_type === 'DELETE' ? '#fee2e2' : '#e0e7ff', color: log.action_type === 'DELETE' ? '#991b1b' : '#3730a3', fontSize: '10px' }}>
                              {log.action_type}
                            </span>
                          </td>
                          <td style={{ padding: '10px', fontWeight: '700', color: '#0f172a' }}>{log.candidate_name}</td>
                          <td style={{ padding: '10px', color: '#334155' }}>{log.candidate_company}</td>
                          <td style={{ padding: '10px', color: '#64748b', fontSize: '11px' }}>{formattedDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'reports' ? (
          <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '16px', fontWeight: '800' }}>
                {userRole === 'HR' ? '📊 Your Month-Wise Performance Reports' : 'Month-wise Revenue & HR Performance'}
              </h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Filter Month:</label>
                <select 
                  className="modern-input" 
                  value={userRole === 'HR' ? hrSelectedReportMonth : selectedReportMonth} 
                  onChange={(e) => userRole === 'HR' ? setHrSelectedReportMonth(e.target.value) : setSelectedReportMonth(e.target.value)} 
                  style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', fontWeight: '700' }}
                >
                  <option value="All">All Months</option>
                  {userRole === 'HR' ? (
                    Object.keys(hrMonthlyBreakdown).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))
                  ) : (
                    Object.keys(monthlyData).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* HR Reports View */}
            {userRole === 'HR' ? (
              Object.keys(hrMonthlyBreakdown).length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '13px' }}>No records found for reporting.</p>
              ) : (
                Object.keys(hrMonthlyBreakdown)
                  .filter(month => hrSelectedReportMonth === 'All' || month === hrSelectedReportMonth)
                  .map((month) => {
                    const mData = hrMonthlyBreakdown[month];
                    return (
                      <div key={month} style={{ marginBottom: '24px', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '16px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                          <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '16px', fontWeight: '800' }}>📅 {month}</h3>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontWeight: '700', flexWrap: 'wrap' }}>
                            <span style={{ background: '#f1f5f9', color: '#1e293b', padding: '4px 8px', borderRadius: '6px' }}>Total: {mData.total}</span>
                            <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 8px', borderRadius: '6px' }}>Selected: {mData.selected}</span>
                            <span style={{ background: '#d1fae5', color: '#065f46', padding: '4px 8px', borderRadius: '6px' }}>Joined: {mData.joined}</span>
                            <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '6px' }}>Dropped: {mData.dropped}</span>
                            <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '6px' }}>Rejected: {mData.rejected}</span>
                          </div>
                        </div>

                        <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#334155', fontWeight: '700' }}>Candidates List for {month}:</h4>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#475569' }}>
                                <th style={{ padding: '8px' }}>Candidate Name</th>
                                <th style={{ padding: '8px' }}>Company & Process</th>
                                <th style={{ padding: '8px' }}>Joining Date</th>
                                <th style={{ padding: '8px' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mData.candidates.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '8px', fontWeight: '700', color: '#0f172a' }}>{c.name}</td>
                                  <td style={{ padding: '8px' }}>{c.company_name} ({c.process_name})</td>
                                  <td style={{ padding: '8px' }}>{c.joining_date || 'N/A'}</td>
                                  <td style={{ padding: '8px' }}>
                                    <span style={{ padding: '2px 6px', borderRadius: '10px', fontWeight: '700', background: c.status === 'Joined' ? '#d1fae5' : '#fef3c7', color: c.status === 'Joined' ? '#065f46' : '#b45309' }}>
                                      {c.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
              )
            ) : (
              // Partner Reports View
              Object.keys(monthlyData).length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '13px' }}>No records found for reporting.</p>
              ) : (
                Object.keys(monthlyData)
                  .filter(month => selectedReportMonth === 'All' || month === selectedReportMonth)
                  .map((month) => {
                    const mData = monthlyData[month];
                    const sortedHRs = Object.keys(mData.recruiters).sort((a, b) => mData.recruiters[b].revenue - mData.recruiters[a].revenue);
                    const topHRName = sortedHRs[0] || 'N/A';

                    return (
                      <div key={month} style={{ marginBottom: '24px', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '16px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                          <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '16px', fontWeight: '800' }}>📅 {month}</h3>
                          <div style={{ display: 'flex', gap: '10px', fontSize: '11px', fontWeight: '700', flexWrap: 'wrap' }}>
                            <span style={{ background: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: '6px' }}>Total Rev: Rs. {mData.totalRevenue.toLocaleString('en-IN')}</span>
                            <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 10px', borderRadius: '6px' }}>Total Selections: {mData.joinedCount}</span>
                            <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '6px' }}>Total Drops: {mData.droppedCount}</span>
                            <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '6px' }}>🏆 Top HR: {topHRName}</span>
                          </div>
                        </div>

                        <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#334155', fontWeight: '700' }}>HR Individual Performance & 1-Click Monthly Reports:</h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                          {Object.keys(mData.recruiters).map(hrName => {
                            const hrStats = mData.recruiters[hrName];
                            const hasEmailRegistered = hrEmailDirectory[hrName];

                            return (
                              <div key={hrName} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>👤 {hrName}</strong>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669', background: '#d1fae5', padding: '2px 6px', borderRadius: '4px' }}>Rs. {hrStats.revenue.toLocaleString('en-IN')}</span>
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#475569', marginBottom: '8px', display: 'flex', gap: '12px' }}>
                                    <span>Joined/Selected: <strong>{hrStats.joined}</strong></span>
                                    <span>Dropped: <strong style={{ color: '#ef4444' }}>{hrStats.dropped}</strong></span>
                                  </div>
                                </div>

                                {hasEmailRegistered ? (
                                  <button 
                                    onClick={() => sendHRPerformanceEmail(hrName, month, hrStats)}
                                    style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '6px' }}
                                    title={`Send performance report to ${hrName}`}
                                  >
                                    ✉️ Email Report to {hrName}
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', marginTop: '6px' }}>Email not configured</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
              )
            )}
          </div>
        ) : (
          <>
            {userRole === 'Partner' && (
              <div className="responsive-stats">
                <div style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.2)' }}>
                  <h3 style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, fontWeight: '700' }}>
                    {filterHR === 'All' ? 'Active Revenue Pipeline' : `Revenue (${filterHR})`}
                  </h3>
                  <p style={{ margin: '6px 0 0 0', fontSize: '24px', fontWeight: '800' }}>Rs. {totalRevenue.toLocaleString('en-IN')}</p>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.2)' }}>
                  <h3 style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, fontWeight: '700' }}>
                    {filterHR === 'All' ? 'Active Lateral Hirings (≥ 30k)' : `Lateral Hirings (${filterHR})`}
                  </h3>
                  <p style={{ margin: '6px 0 0 0', fontSize: '24px', fontWeight: '800' }}>{lateralHiringCount} Candidates</p>
                </div>
              </div>
            )}

            {/* HR Monthly Summary Cards Dashboard */}
            {userRole === 'HR' && (
              <div className="glass-card" style={{ padding: '16px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>📊 Your Monthly Performance Summary</h3>
                </div>

                {(() => {
                  let calcTotal = 0;
                  let calcSelected = 0;
                  let calcJoined = 0;
                  let calcDropped = 0;
                  let calcRejected = 0;

                  Object.values(hrMonthlyBreakdown).forEach(val => {
                    calcTotal += val.total;
                    calcSelected += val.selected;
                    calcJoined += val.joined;
                    calcDropped += val.dropped;
                    calcRejected += val.rejected;
                  });

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Handled</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{calcTotal}</p>
                      </div>
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#1d4ed8', fontWeight: '700', textTransform: 'uppercase' }}>Selected</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#1e40af' }}>{calcSelected}</p>
                      </div>
                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#047857', fontWeight: '700', textTransform: 'uppercase' }}>Joined</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#065f46' }}>{calcJoined}</p>
                      </div>
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#b45309', fontWeight: '700', textTransform: 'uppercase' }}>Dropped</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#92400e' }}>{calcDropped}</p>
                      </div>
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#b91c1c', fontWeight: '700', textTransform: 'uppercase' }}>Rejected</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#991b1b' }}>{calcRejected}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="responsive-grid">
              
              {/* Form Card */}
              <div className="glass-card" style={{ padding: '16px', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', height: 'fit-content' }}>
                <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  {userRole === 'HR' ? (isEditing ? '✏️ Edit Entry' : `📝 Daily Entry Form (${currentLoggedInHRName})`) : (isEditing ? '✏️️ Edit Candidate' : '➕ Add Candidate')}
                </h3>
                <form onSubmit={handleFormSubmit}>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Candidate Name *</label>
                    <input type="text" className="modern-input" placeholder="e.g. Rahul Sharma" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '12px' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Email Address</label>
                    <input type="email" className="modern-input" placeholder="candidate@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '12px' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Phone Number *</label>
                    <input type="text" className="modern-input" placeholder="9876543210" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '12px' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Company Name *</label>
                    <select 
                      className="modern-input"
                      value={formData.company_name} 
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} 
                      required 
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#fff', fontSize: '12px' }}
                    >
                      <option value="" disabled>-- Select Client Company --</option>
                      {predefinedCompanies.map(comp => (
                        <option key={comp} value={comp}>{comp}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Process Name *</label>
                    <input type="text" className="modern-input" placeholder="e.g. US Voice" value={formData.process_name} onChange={(e) => setFormData({ ...formData, process_name: e.target.value })} required style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '12px' }} />
                  </div>
                  
                  {userRole === 'Partner' && (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Internal HR Name *</label>
                      <select 
                        className="modern-input"
                        value={isOtherSelected ? 'Other' : formData.recruiter} 
                        onChange={(e) => {
                          if (e.target.value === 'Other') {
                            setIsOtherSelected(true);
                            setFormData({ ...formData, recruiter: '' });
                          } else {
                            setIsOtherSelected(false);
                            setFormData({ ...formData, recruiter: e.target.value });
                          }
                        }} 
                        required={!isOtherSelected}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#fff', fontSize: '12px' }}
                      >
                        <option value="" disabled>-- Select HR --</option>
                        {predefinedHRs.map(hr => (
                          <option key={hr} value={hr}>{hr}</option>
                        ))}
                        <option value="Other">➕ Other</option>
                      </select>

                      {isOtherSelected && (
                        <input 
                          type="text" 
                          className="modern-input"
                          placeholder="Enter new HR name..." 
                          value={otherRecruiterInput} 
                          onChange={(e) => setOtherRecruiterInput(e.target.value)} 
                          required 
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #6366f1', boxSizing: 'border-box', marginTop: '6px', fontSize: '12px' }} 
                        />
                      )}
                    </div>
                  )}

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Selection Date (Optional)</label>
                    <input type="date" className="modern-input" value={formData.selection_date} onChange={(e) => setFormData({ ...formData, selection_date: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '12px' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Joining Date *</label>
                    <input type="date" className="modern-input" value={formData.joining_date} onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })} required style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '12px' }} />
                  </div>

                  {userRole === 'Partner' && (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Revenue (INR) *</label>
                      <input type="number" className="modern-input" placeholder="e.g. 35000" value={formData.revenue} onChange={(e) => setFormData({ ...formData, revenue: e.target.value })} required style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '12px' }} />
                    </div>
                  )}

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Candidate Status</label>
                    <select className="modern-input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '12px', backgroundColor: '#fff' }}>
                      <option value="Yet to Join">Yet to Join</option>
                      <option value="Selected">Selected</option>
                      <option value="Joined">Joined</option>
                      <option value="Dropped">Dropped</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Notes / Remarks</label>
                    <textarea 
                      className="modern-input"
                      placeholder="Remarks..." 
                      value={formData.notes} 
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                      rows="2"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', resize: 'vertical', fontSize: '12px' }} 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" style={{ flex: 1, padding: '9px', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
                      {userRole === 'HR' ? (isEditing ? 'Update Entry 🚀' : 'Submit Entry 🚀') : (isEditing ? 'Update Candidate' : 'Save Candidate')}
                    </button>
                    {isEditing && (
                      <button type="button" onClick={() => { setIsEditing(false); setCurrentId(null); setIsOtherSelected(false); setFormData({ name: '', email: '', phone: '', recruiter: '', company_name: '', process_name: '', client_poc: '', selection_date: '', joining_date: '', revenue: '', status: 'Yet to Join', invoice_status: 'Pending', invoice_number: '', payment_date: '', payment_mode: 'NEFT', notes: '' }); }} style={{ padding: '9px 12px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Data Display Section */}
              <div className="glass-card" style={{ padding: '16px', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    {userRole === 'HR' ? `Your Submitted Candidates (${filteredCandidates.length})` : `Directory (${filteredCandidates.length})`}
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', width: '100%' }}>
                    <input type="text" className="modern-input" placeholder="Search name, company..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: '1', minWidth: '110px', fontSize: '11px' }} />
                    
                    {userRole === 'Partner' && (
                      <select className="modern-input" value={filterHR} onChange={(e) => setFilterHR(e.target.value)} style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: '1', minWidth: '85px', fontSize: '11px', backgroundColor: '#fff' }}>
                        <option value="All">All HRs</option>
                        {allRecruiters.map(hr => (
                          <option key={hr} value={hr}>{hr}</option>
                        ))}
                      </select>
                    )}

                    <select className="modern-input" value={filterStage} onChange={(e) => setFilterStage(e.target.value)} style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: '1', minWidth: '95px', fontSize: '11px', backgroundColor: '#fff' }}>
                      <option value="All">All Status</option>
                      <option value="Yet to Join">Yet to Join</option>
                      <option value="Selected">Selected</option>
                      <option value="Joined">Joined</option>
                      <option value="Dropped">Dropped</option>
                      <option value="Rejected">Rejected</option>
                    </select>

                    {userRole === 'Partner' && (
                      <select className="modern-input" value={filterInvoiceStatus} onChange={(e) => setFilterInvoiceStatus(e.target.value)} style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: '1', minWidth: '100px', fontSize: '11px', backgroundColor: '#fff' }}>
                        <option value="All">All Invoices</option>
                        <option value="Pending">Pending</option>
                        <option value="Ready to Invoice">Ready</option>
                        <option value="Invoice Raised / Pending Clearance">Pending Clearance</option>
                        <option value="Paid">Paid</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* DESKTOP TABLE VIEW */}
                <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '650px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#475569', fontWeight: '700' }}>
                        <th style={{ padding: '9px 10px', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>Candidate</th>
                        <th style={{ padding: '9px 10px' }}>Company & Process</th>
                        <th style={{ padding: '9px 10px' }}>Dates</th>
                        {userRole === 'Partner' && <th style={{ padding: '9px 10px' }}>Revenue</th>}
                        <th style={{ padding: '9px 10px' }}>Stage</th>
                        {userRole === 'Partner' && <th style={{ padding: '9px 10px' }}>Invoice Status</th>}
                        <th style={{ padding: '9px 10px', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map((item) => {
                        const rev = parseFloat(item.revenue || 0);
                        return (
                          <tr key={item.id} className="hover-effect" style={{ borderBottom: '1px solid #f1f5f9', opacity: (item.status === 'Dropped' || item.status === 'Rejected') ? 0.6 : 1 }}>
                            <td style={{ padding: '10px' }}>
                              <div onClick={() => setSelectedCandidate(item)} style={{ fontWeight: '700', color: '#4f46e5', cursor: 'pointer' }}>{item.name}</div>
                              <div style={{ fontSize: '10px', color: '#64748b' }}>📞 {item.phone || 'N/A'} • ✉️ {item.email || 'N/A'}</div>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <div style={{ fontWeight: '700', color: '#1e293b' }}>🏢 {item.company_name || 'N/A'}</div>
                              <div style={{ fontSize: '10px', color: '#475569' }}>Proc: {item.process_name || 'N/A'} • HR: {item.recruiter}</div>
                            </td>
                            <td style={{ padding: '10px', fontSize: '11px', color: '#475569' }}>
                              {item.selection_date && <div>Sel: {item.selection_date}</div>}
                              <div>Join: {item.joining_date || 'N/A'}</div>
                            </td>
                            {userRole === 'Partner' && (
                              <td style={{ padding: '10px', fontWeight: '700', color: '#0f172a' }}>Rs. {rev.toLocaleString('en-IN')}</td>
                            )}
                            <td style={{ padding: '10px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: item.status === 'Joined' ? '#d1fae5' : '#fef3c7', color: item.status === 'Joined' ? '#065f46' : '#b45309' }}>
                                {item.status}
                              </span>
                            </td>
                            {userRole === 'Partner' && (
                              <td style={{ padding: '10px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: item.invoice_status === 'Paid' ? '#d1fae5' : item.invoice_status === 'Ready to Invoice' ? '#fef3c7' : item.invoice_status === 'Invoice Raised / Pending Clearance' ? '#fee2e2' : '#f1f5f9', color: item.invoice_status === 'Paid' ? '#065f46' : item.invoice_status === 'Invoice Raised / Pending Clearance' ? '#991b1b' : '#334155' }}>
                                  {item.invoice_status}
                                </span>
                                {item.invoice_number && <div style={{ fontSize: '9px', color: '#4f46e5', marginTop: '2px', fontWeight: '700' }}>Inv#: {item.invoice_number}</div>}
                              </td>
                            )}
                            <td style={{ padding: '10px' }}>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {userRole === 'Partner' && (item.invoice_status === 'Ready to Invoice' || item.invoice_status === 'Invoice Raised / Pending Clearance') && (
                                  <button onClick={() => setPaymentModalCandidate(item)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>Paid</button>
                                )}
                                <button onClick={() => handleEditClick(item)} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>Edit</button>
                                <button onClick={() => handleDeleteCandidate(item, item.created_at)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>Del</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE CARD VIEW */}
                <div className="mobile-card-view">
                  {filteredCandidates.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', padding: '20px' }}>No candidates found.</p>
                  ) : (
                    filteredCandidates.map((item) => {
                      const rev = parseFloat(item.revenue || 0);
                      return (
                        <div key={item.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', marginBottom: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <div>
                              <div onClick={() => setSelectedCandidate(item)} style={{ fontWeight: '800', color: '#4f46e5', fontSize: '13px', cursor: 'pointer' }}>{item.name}</div>
                              <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '600' }}>🏢 {item.company_name} ({item.process_name})</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              {userRole === 'Partner' && <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '12px' }}>Rs. {rev.toLocaleString('en-IN')}</div>}
                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: '700', background: item.status === 'Joined' ? '#d1fae5' : '#fef3c7', color: item.status === 'Joined' ? '#065f46' : '#b45309' }}>
                                {item.status}
                              </span>
                            </div>
                          </div>

                          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>HR: <strong>{item.recruiter}</strong></span>
                            <span>Join: {item.joining_date || 'N/A'}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                            {userRole === 'Partner' ? (
                              <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '6px', background: item.invoice_status === 'Paid' ? '#d1fae5' : '#fee2e2', color: item.invoice_status === 'Paid' ? '#065f46' : '#991b1b' }}>
                                {item.invoice_status} {item.invoice_number ? `(#${item.invoice_number})` : ''}
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', color: '#64748b' }}>Submitted by you</span>
                            )}
                            
                            <div style={{ display: 'flex', gap: '5px' }}>
                              {userRole === 'Partner' && (item.invoice_status === 'Ready to Invoice' || item.invoice_status === 'Invoice Raised / Pending Clearance') && (
                                <button onClick={() => setPaymentModalCandidate(item)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700' }}>Paid</button>
                              )}
                              <button onClick={() => handleEditClick(item)} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700' }}>Edit</button>
                              <button onClick={() => handleDeleteCandidate(item, item.created_at)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700' }}>Del</button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

            </div>
          </>
        )}

        {/* Batch Invoice Modal (Partner Only) */}
        {showInvoiceModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '12px' }}>
            <div className="animated-modal glass-card" style={{ background: '#fff', padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '450px' }}>
              <h3 style={{ marginTop: 0, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', fontSize: '16px', fontWeight: '800' }}>Create Group Invoice Number</h3>
              <form onSubmit={handleBatchInvoiceSubmit}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Invoice Number *</label>
                  <input type="text" className="modern-input" placeholder="e.g. JG/2026/045" value={batchInvoiceNumber} onChange={(e) => setBatchInvoiceNumber(e.target.value)} required style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                </div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '5px' }}>Select Candidates (Ready to Invoice):</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', marginBottom: '14px', background: '#f8fafc' }}>
                  {readyToInvoiceList.length === 0 ? (
                    <p style={{ fontSize: '11px', color: '#64748b' }}>No candidates ready to invoice.</p>
                  ) : (
                    readyToInvoiceList.map(cand => (
                      <label key={cand.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '11px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedForBatchInvoice.includes(cand.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedForBatchInvoice([...selectedForBatchInvoice, cand.id]);
                            } else {
                              setSelectedForBatchInvoice(selectedForBatchInvoice.filter(id => id !== cand.id));
                            }
                          }}
                        />
                        <strong>{cand.name}</strong> ({cand.company_name}) - Rs. {parseFloat(cand.revenue || 0).toLocaleString('en-IN')}
                      </label>
                    ))
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ flex: 1, padding: '10px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
                    Generate & Move to Pending
                  </button>
                  <button type="button" onClick={() => setShowInvoiceModal(false)} style={{ padding: '10px 12px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Mark as Paid Modal (Partner Only) */}
        {paymentModalCandidate && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '12px' }}>
            <div className="animated-modal glass-card" style={{ background: '#fff', padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '380px' }}>
              <h3 style={{ marginTop: 0, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', fontSize: '16px', fontWeight: '800' }}>Confirm Payment</h3>
              <form onSubmit={handleMarkAsPaidSubmit}>
                <p style={{ fontSize: '12px', color: '#475569', marginBottom: '14px' }}>Candidate: <strong style={{ color: '#0f172a' }}>{paymentModalCandidate.name}</strong></p>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Payment Date *</label>
                  <input type="date" className="modern-input" value={paymentDateInput} onChange={(e) => setPaymentDateInput(e.target.value)} required style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Payment Mode *</label>
                  <select className="modern-input" value={paymentModeInput} onChange={(e) => setPaymentModeInput(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="NEFT">NEFT</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ flex: 1, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
                    Mark as Paid
                  </button>
                  <button type="button" onClick={() => setPaymentModalCandidate(null)} style={{ padding: '10px 12px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Candidate Detail Modal */}
        {selectedCandidate && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '12px' }}>
            <div className="animated-modal glass-card" style={{ background: '#fff', padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '380px' }}>
              <h3 style={{ marginTop: 0, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', fontSize: '16px', fontWeight: '800' }}>Candidate Profile</h3>
              <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#334155' }}>
                <p><strong>Name:</strong> {selectedCandidate.name}</p>
                <p><strong>Email:</strong> {selectedCandidate.email || 'N/A'}</p>
                <p><strong>Phone:</strong> {selectedCandidate.phone || 'N/A'}</p>
                <p><strong>Company:</strong> {selectedCandidate.company_name || 'N/A'}</p>
                <p><strong>Process:</strong> {selectedCandidate.process_name || 'N/A'}</p>
                <p><strong>Internal HR:</strong> {selectedCandidate.recruiter || 'N/A'}</p>
                <p><strong>Selection Date:</strong> {selectedCandidate.selection_date || 'N/A'}</p>
                <p><strong>Joining Date:</strong> {selectedCandidate.joining_date || 'N/A'}</p>
                {userRole === 'Partner' && <p><strong>Revenue:</strong> Rs. {parseFloat(selectedCandidate.revenue || 0).toLocaleString('en-IN')}</p>}
                <p><strong>Status:</strong> {selectedCandidate.status}</p>
                {userRole === 'Partner' && <p><strong>Invoice Status:</strong> {selectedCandidate.invoice_status}</p>}
                {userRole === 'Partner' && selectedCandidate.invoice_number && <p><strong>Invoice Number:</strong> {selectedCandidate.invoice_number}</p>}
                {selectedCandidate.notes && <p><strong>Notes:</strong> {selectedCandidate.notes}</p>}
              </div>
              <button onClick={() => setSelectedCandidate(null)} style={{ marginTop: '16px', width: '100%', padding: '10px', background: '#475569', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
