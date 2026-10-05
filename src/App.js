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
  
  // Pagination State (15 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // Confirmation Modal State for Add, Edit, Delete
  const [pendingAction, setPendingAction] = useState(null); // { type: 'ADD' | 'EDIT' | 'DELETE', data: ..., message: '...' }

  const [companyLogo, setCompanyLogo] = useState(() => {
    return localStorage.getItem('crm_custom_logo') || 'https://www.jobgiants.in/wp-content/uploads/2023/10/cropped-Logo-1.png';
  });
  
  const predefinedHRs = ['Sanchi', 'Sadaf', 'Anjali', 'Shrey', 'Juveria'];
  const predefinedCompanies = ['Transom', 'HGS', 'iQor', 'Atain', 'Vertex Group', 'Shaadi.com', 'iEnergizer'];

  const hrDatabase = {
    'sanchi.aggarwal@jobgiants.in': { name: 'Sanchi', password: 'Sanwall@2024' },
    'sadaf.kazi@jobgiants.in': { name: 'Sadaf', password: 'Sadkaz@2025' },
    'anjali.srivastava@jobgiants.in': { name: 'Anjali', password: 'Anjsri@2026' },
    'juveria.hashmi@jobgiants.in': { name: 'Juveria', password: 'Juvhas@2026' }
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

  // Reset pagination when filters or search term change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterInvoiceStatus, filterStage, filterHR]);

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
    'Anjali': 'anjali.srivastava@jobgiants.in',
    'Juveria': 'juveria.hashmi@jobgiants.in'
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

  // Pagination Calculations
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(startIndex, startIndex + itemsPerPage);

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
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                {userRole === 'Partner' ? '👑 Partner Portal' : `👤 HR Portal • ${currentLoggedInHRName}`}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {userRole === 'Partner' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '5px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Logo:</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ fontSize: '10px', width: '160px' }} />
              </div>
            )}
            <button 
              onClick={() => { setIsLoggedIn(false); setLoginPassword(''); }}
              style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
            >
              Logout 🚪
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', background: activeTab === 'dashboard' ? '#4f46e5' : '#fff', color: activeTab === 'dashboard' ? '#fff' : '#475569', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
          >
            📊 {userRole === 'Partner' ? 'Partner Dashboard' : 'My Performance'}
          </button>
          
          <button 
            onClick={() => setActiveTab('candidates')} 
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', background: activeTab === 'candidates' ? '#4f46e5' : '#fff', color: activeTab === 'candidates' ? '#fff' : '#475569', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
          >
            👥 Candidate Database ({filteredCandidates.length})
          </button>

          {userRole === 'Partner' && (
            <button 
              onClick={() => setActiveTab('invoices')} 
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', background: activeTab === 'invoices' ? '#4f46e5' : '#fff', color: activeTab === 'invoices' ? '#fff' : '#475569', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
            >
              💰 Invoice Manager ({readyToInvoiceList.length})
            </button>
          )}

          {userRole === 'Partner' && (
            <button 
              onClick={() => setActiveTab('audit')} 
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', background: activeTab === 'audit' ? '#4f46e5' : '#fff', color: activeTab === 'audit' ? '#fff' : '#475569', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
            >
              🛡️ Audit Logs ({auditLogs.length})
            </button>
          )}
        </div>

        {/* TAB 1: DASHBOARD / PERFORMANCE */}
        {activeTab === 'dashboard' && (
          <div className="animated-container">
            {userRole === 'Partner' ? (
              <div>
                {/* Partner KPI Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div className="glass-card" style={{ padding: '16px', borderRadius: '14px', borderLeft: '4px solid #4f46e5' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Active Revenue</span>
                    <h2 style={{ margin: '6px 0 0 0', fontSize: '20px', color: '#0f172a', fontWeight: '800' }}>₹ {totalRevenue.toLocaleString('en-IN')}</h2>
                  </div>
                  <div className="glass-card" style={{ padding: '16px', borderRadius: '14px', borderLeft: '4px solid #10b981' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Joined Candidates</span>
                    <h2 style={{ margin: '6px 0 0 0', fontSize: '20px', color: '#0f172a', fontWeight: '800' }}>
                      {candidates.filter(item => item.status === 'Joined').length}
                    </h2>
                  </div>
                  <div className="glass-card" style={{ padding: '16px', borderRadius: '14px', borderLeft: '4px solid #f59e0b' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Ready To Invoice (&gt;90 Days)</span>
                    <h2 style={{ margin: '6px 0 0 0', fontSize: '20px', color: '#0f172a', fontWeight: '800' }}>{readyToInvoiceList.length}</h2>
                  </div>
                  <div className="glass-card" style={{ padding: '16px', borderRadius: '14px', borderLeft: '4px solid #ec4899' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Lateral Selections (≥₹30k)</span>
                    <h2 style={{ margin: '6px 0 0 0', fontSize: '20px', color: '#0f172a', fontWeight: '800' }}>{lateralHiringCount}</h2>
                  </div>
                </div>

                {/* Monthly Reports & Email Controls */}
                <div className="glass-card" style={{ padding: '20px', borderRadius: '14px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>📈 Monthly Recruiter Performance & Report Generator</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={sendMonthlyReportEmail}
                        style={{ padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        📧 Send Overall Monthly Report (Gmail)
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '10px' }}>Month</th>
                          <th style={{ padding: '10px' }}>Joined</th>
                          <th style={{ padding: '10px' }}>Dropped / Rejected</th>
                          <th style={{ padding: '10px' }}>Revenue (₹)</th>
                          <th style={{ padding: '10px' }}>HR Performance Breakdown</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(monthlyData).length === 0 ? (
                          <tr><td colSpan="5" style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>No candidate data available yet.</td></tr>
                        ) : (
                          Object.entries(monthlyData).map(([monthKey, mData]) => (
                            <tr key={monthKey} style={{ borderBottom: '1px solid #e2e8f0' }} className="hover-effect">
                              <td style={{ padding: '10px', fontWeight: '700', color: '#0f172a' }}>{monthKey}</td>
                              <td style={{ padding: '10px', color: '#10b981', fontWeight: '700' }}>{mData.joinedCount}</td>
                              <td style={{ padding: '10px', color: '#ef4444', fontWeight: '700' }}>{mData.droppedCount}</td>
                              <td style={{ padding: '10px', fontWeight: '800', color: '#4f46e5' }}>₹ {mData.totalRevenue.toLocaleString('en-IN')}</td>
                              <td style={{ padding: '10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {Object.entries(mData.recruiters).map(([recName, recVals]) => (
                                    <div key={recName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '11px' }}>
                                      <span><strong>{recName}</strong>: Joined: {recVals.joined} | Rev: ₹ {recVals.revenue.toLocaleString('en-IN')}</span>
                                      {hrEmailDirectory[recName] && (
                                        <button 
                                          onClick={() => sendHRPerformanceEmail(recName, monthKey, recVals)}
                                          style={{ padding: '2px 6px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                          Send Email ✉️
                                        </button>
                                      )}
                                    </div>
                                  ))}
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
            ) : (
              /* HR Performance Portal */
              <div className="glass-card" style={{ padding: '20px', borderRadius: '14px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>👋 Welcome, {currentLoggedInHRName}! Here is your performance summary:</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Total Candidates Handled</span>
                    <h2 style={{ margin: '6px 0 0 0', fontSize: '18px', color: '#0f172a', fontWeight: '800' }}>{hrCandidatesList.length}</h2>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Successful Joinings</span>
                    <h2 style={{ margin: '6px 0 0 0', fontSize: '18px', color: '#10b981', fontWeight: '800' }}>
                      {hrCandidatesList.filter(item => item.status === 'Joined').length}
                    </h2>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Dropped / Rejected</span>
                    <h2 style={{ margin: '6px 0 0 0', fontSize: '18px', color: '#ef4444', fontWeight: '800' }}>
                      {hrCandidatesList.filter(item => item.status === 'Dropped' || item.status === 'Rejected').length}
                    </h2>
                  </div>
                </div>

                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>Monthly Breakdown</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '10px' }}>Month</th>
                        <th style={{ padding: '10px' }}>Total Selections</th>
                        <th style={{ padding: '10px' }}>Joined</th>
                        <th style={{ padding: '10px' }}>Dropped</th>
                        <th style={{ padding: '10px' }}>Yet to Join</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(hrMonthlyBreakdown).length === 0 ? (
                        <tr><td colSpan="5" style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>No entries found for your profile.</td></tr>
                      ) : (
                        Object.entries(hrMonthlyBreakdown).map(([monthKey, data]) => (
                          <tr key={monthKey} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '10px', fontWeight: '700', color: '#0f172a' }}>{monthKey}</td>
                            <td style={{ padding: '10px', fontWeight: '700' }}>{data.total}</td>
                            <td style={{ padding: '10px', color: '#10b981', fontWeight: '700' }}>{data.joined}</td>
                            <td style={{ padding: '10px', color: '#ef4444', fontWeight: '700' }}>{data.dropped}</td>
                            <td style={{ padding: '10px', color: '#f59e0b', fontWeight: '700' }}>{data.yetToJoin}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CANDIDATE DATABASE & FORM */}
        {activeTab === 'candidates' && (
          <div className="animated-container responsive-grid">
            
            {/* Left Column: Add / Edit Candidate Form */}
            <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', height: 'fit-content' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  {isEditing ? '✏️ Edit Candidate' : '➕ Add New Candidate'}
                </h3>
                {isEditing && (
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setCurrentId(null);
                      setFormData({ 
                        name: '', email: '', phone: '', recruiter: userRole === 'HR' ? currentLoggedInHRName : '', 
                        company_name: '', process_name: '', client_poc: '', selection_date: '', joining_date: '', 
                        revenue: '', status: 'Yet to Join', invoice_status: 'Pending', invoice_number: '', 
                        payment_date: '', payment_mode: 'NEFT', notes: ''
                      });
                      setIsOtherSelected(false);
                    }}
                    style={{ fontSize: '11px', background: '#e2e8f0', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Bulk Upload & Sample CSV buttons */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', marginBottom: '16px', border: '1px dashed #cbd5e1' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Bulk Import via CSV</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input type="file" accept=".csv" onChange={handleFileUpload} style={{ fontSize: '11px', width: '100%' }} />
                  <button 
                    type="button" 
                    onClick={downloadSampleCSV}
                    style={{ fontSize: '11px', padding: '6px 10px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', width: '100%' }}
                  >
                    📥 Download CSV Template
                  </button>
                </div>
              </div>

              <form onSubmit={handleFormSubmit}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Candidate Name *</label>
                  <input 
                    type="text" 
                    placeholder="Full name..." 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className="modern-input"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Email Address</label>
                  <input 
                    type="email" 
                    placeholder="candidate@email.com" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="modern-input"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="10-digit mobile..." 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="modern-input"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Client Company *</label>
                  <select 
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    required
                    className="modern-input"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="">Select Company...</option>
                    {predefinedCompanies.map(comp => (
                      <option key={comp} value={comp}>{comp}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Process Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. US Voice, Backend..." 
                    value={formData.process_name} 
                    onChange={(e) => setFormData({...formData, process_name: e.target.value})}
                    className="modern-input"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Client POC</label>
                  <input 
                    type="text" 
                    placeholder="Client HR Contact..." 
                    value={formData.client_poc} 
                    onChange={(e) => setFormData({...formData, client_poc: e.target.value})}
                    className="modern-input"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                {userRole === 'Partner' && (
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Internal HR Recruiter *</label>
                    {!isOtherSelected ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select 
                          value={formData.recruiter}
                          onChange={(e) => {
                            if (e.target.value === 'OTHER_OPTION') {
                              setIsOtherSelected(true);
                              setFormData({...formData, recruiter: ''});
                            } else {
                              setFormData({...formData, recruiter: e.target.value});
                            }
                          }}
                          required
                          className="modern-input"
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                        >
                          <option value="">Select HR Recruiter...</option>
                          {allRecruiters.map(hr => (
                            <option key={hr} value={hr}>{hr}</option>
                          ))}
                          <option value="OTHER_OPTION">➕ Other (Type Name)...</option>
                        </select>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input 
                          type="text"
                          placeholder="Type HR name..."
                          value={otherRecruiterInput}
                          onChange={(e) => setOtherRecruiterInput(e.target.value)}
                          required
                          className="modern-input"
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                        <button 
                          type="button" 
                          onClick={() => { setIsOtherSelected(false); setOtherRecruiterInput(''); }}
                          style={{ padding: '0 8px', fontSize: '11px', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          Back
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Selection Date</label>
                    <input 
                      type="date" 
                      value={formData.selection_date} 
                      onChange={(e) => setFormData({...formData, selection_date: e.target.value})}
                      className="modern-input"
                      style={{ width: '100%', padding: '8px 6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Joining Date</label>
                    <input 
                      type="date" 
                      value={formData.joining_date} 
                      onChange={(e) => setFormData({...formData, joining_date: e.target.value})}
                      className="modern-input"
                      style={{ width: '100%', padding: '8px 6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {userRole === 'Partner' && (
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Revenue (₹) *</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 35000" 
                      value={formData.revenue} 
                      onChange={(e) => setFormData({...formData, revenue: e.target.value})}
                      required
                      className="modern-input"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Candidate Stage *</label>
                  <select 
                    value={formData.status} 
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="modern-input"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="Yet to Join">Yet to Join</option>
                    <option value="Joined">Joined</option>
                    <option value="Selected">Selected</option>
                    <option value="Dropped">Dropped</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Notes / Remarks</label>
                  <textarea 
                    placeholder="Add notes..." 
                    value={formData.notes} 
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows="2"
                    className="modern-input"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                <button 
                  type="submit" 
                  style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                >
                  {isEditing ? '💾 Save Changes' : '➕ Add Candidate'}
                </button>
              </form>
            </div>

            {/* Right Column: Candidate List Table with Filters & Pagination */}
            <div className="glass-card" style={{ padding: '20px', borderRadius: '16px' }}>
              
              {/* Search & Filters Bar */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="🔍 Search candidates, company, recruiter..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />

                <select 
                  value={filterStage} 
                  onChange={(e) => setFilterStage(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}
                >
                  <option value="All">All Stages</option>
                  <option value="Yet to Join">Yet to Join</option>
                  <option value="Joined">Joined</option>
                  <option value="Selected">Selected</option>
                  <option value="Dropped">Dropped</option>
                  <option value="Rejected">Rejected</option>
                </select>

                {userRole === 'Partner' && (
                  <>
                    <select 
                      value={filterInvoiceStatus} 
                      onChange={(e) => setFilterInvoiceStatus(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}
                    >
                      <option value="All">All Invoices</option>
                      <option value="Pending">Pending (&lt;90 Days)</option>
                      <option value="Ready to Invoice">Ready to Invoice (&gt;90 Days)</option>
                      <option value="Invoice Raised / Pending Clearance">Invoice Raised</option>
                      <option value="Paid">Paid</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>

                    <select 
                      value={filterHR} 
                      onChange={(e) => setFilterHR(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}
                    >
                      <option value="All">All HRs</option>
                      {allRecruiters.map(hr => (
                        <option key={hr} value={hr}>{hr}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '10px' }}>Sr. No.</th>
                      <th style={{ padding: '10px' }}>Candidate Name</th>
                      <th style={{ padding: '10px' }}>Company</th>
                      <th style={{ padding: '10px' }}>HR</th>
                      <th style={{ padding: '10px' }}>Joining Date</th>
                      {userRole === 'Partner' && <th style={{ padding: '10px' }}>Revenue (₹)</th>}
                      <th style={{ padding: '10px' }}>Stage</th>
                      {userRole === 'Partner' && <th style={{ padding: '10px' }}>Invoice Status</th>}
                      <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={userRole === 'Partner' ? 9 : 7} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                          No candidates found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedCandidates.map((item, index) => {
                        const serialNumber = startIndex + index + 1;
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }} className="hover-effect">
                            <td style={{ padding: '10px', fontWeight: '700', color: '#64748b' }}>{serialNumber}</td>
                            <td style={{ padding: '10px' }}>
                              <strong style={{ color: '#0f172a', display: 'block' }}>{item.name}</strong>
                              <span style={{ fontSize: '10px', color: '#64748b' }}>{item.phone || item.email}</span>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <span style={{ fontWeight: '600', color: '#334155' }}>{item.company_name}</span>
                              {item.process_name && <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>{item.process_name}</span>}
                            </td>
                            <td style={{ padding: '10px', fontWeight: '600' }}>{item.recruiter}</td>
                            <td style={{ padding: '10px', color: '#475569' }}>{item.joining_date || 'N/A'}</td>
                            {userRole === 'Partner' && (
                              <td style={{ padding: '10px', fontWeight: '800', color: '#4f46e5' }}>₹ {parseFloat(item.revenue || 0).toLocaleString('en-IN')}</td>
                            )}
                            <td style={{ padding: '10px' }}>
                              <span style={{
                                padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                                backgroundColor: item.status === 'Joined' ? '#dcfce7' : item.status === 'Dropped' || item.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                                color: item.status === 'Joined' ? '#166534' : item.status === 'Dropped' || item.status === 'Rejected' ? '#991b1b' : '#92400e'
                              }}>
                                {item.status}
                              </span>
                            </td>
                            {userRole === 'Partner' && (
                              <td style={{ padding: '10px' }}>
                                <span style={{
                                  padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                                  backgroundColor: item.invoice_status === 'Paid' ? '#dcfce7' : item.invoice_status === 'Ready to Invoice' ? '#fef3c7' : '#f1f5f9',
                                  color: item.invoice_status === 'Paid' ? '#166534' : item.invoice_status === 'Ready to Invoice' ? '#b45309' : '#475569'
                                }}>
                                  {item.invoice_status}
                                </span>
                              </td>
                            )}
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button 
                                  onClick={() => handleEditClick(item)}
                                  style={{ padding: '4px 8px', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => handleDeleteCandidate(item, item.created_at)}
                                  style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="mobile-card-view">
                {paginatedCandidates.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No candidates found.</div>
                ) : (
                  paginatedCandidates.map((item, index) => {
                    const serialNumber = startIndex + index + 1;
                    return (
                      <div key={item.id} style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>#{serialNumber}</span>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#4f46e5' }}>{item.company_name}</span>
                        </div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#0f172a' }}>{item.name}</h4>
                        <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#64748b' }}>HR: {item.recruiter} | Joined: {item.joining_date || 'N/A'}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#166534' }}>{item.status}</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => handleEditClick(item)} style={{ padding: '4px 8px', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>Edit</button>
                            <button onClick={() => handleDeleteCandidate(item, item.created_at)} style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>Delete</button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCandidates.length)} of {filteredCandidates.length} entries (15 per page)
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{ padding: '6px 12px', background: currentPage === 1 ? '#f1f5f9' : '#e0e7ff', color: currentPage === 1 ? '#94a3b8' : '#4f46e5', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>
                    <span style={{ padding: '6px 10px', fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{ padding: '6px 12px', background: currentPage === totalPages ? '#f1f5f9' : '#e0e7ff', color: currentPage === totalPages ? '#94a3b8' : '#4f46e5', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* TAB 3: INVOICE MANAGER */}
        {activeTab === 'invoices' && userRole === 'Partner' && (
          <div className="animated-container glass-card" style={{ padding: '20px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>💰 Invoice & Payment Manager</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Manage candidate placement invoices past the 90-day retention period.</p>
              </div>

              {readyToInvoiceList.length > 0 && (
                <button 
                  onClick={() => setShowInvoiceModal(true)}
                  style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  📄 Raise Batch Invoice ({readyToInvoiceList.length} Ready)
                </button>
              )}
            </div>

            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>Ready to Invoice (&gt;90 Days)</h4>
            <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px', width: '40px' }}>Select</th>
                    <th style={{ padding: '10px' }}>Candidate Name</th>
                    <th style={{ padding: '10px' }}>Company</th>
                    <th style={{ padding: '10px' }}>Recruiter</th>
                    <th style={{ padding: '10px' }}>Joining Date</th>
                    <th style={{ padding: '10px' }}>Revenue (₹)</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {readyToInvoiceList.length === 0 ? (
                    <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No candidates currently ready for invoicing (&gt;90 days).</td></tr>
                  ) : (
                    readyToInvoiceList.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
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
                        </td>
                        <td style={{ padding: '10px', fontWeight: '700', color: '#0f172a' }}>{item.name}</td>
                        <td style={{ padding: '10px' }}>{item.company_name}</td>
                        <td style={{ padding: '10px' }}>{item.recruiter}</td>
                        <td style={{ padding: '10px' }}>{item.joining_date}</td>
                        <td style={{ padding: '10px', fontWeight: '800', color: '#4f46e5' }}>₹ {parseFloat(item.revenue || 0).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button 
                            onClick={() => setPaymentModalCandidate(item)}
                            style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                          >
                            Mark as Paid ✅
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>Pending Invoices / Raised Clearance</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px' }}>Invoice No.</th>
                    <th style={{ padding: '10px' }}>Candidate Name</th>
                    <th style={{ padding: '10px' }}>Company</th>
                    <th style={{ padding: '10px' }}>Revenue (₹)</th>
                    <th style={{ padding: '10px' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvoicesList.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No pending invoices.</td></tr>
                  ) : (
                    pendingInvoicesList.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px', fontWeight: '700', color: '#4f46e5' }}>{item.invoice_number || 'N/A'}</td>
                        <td style={{ padding: '10px', fontWeight: '700', color: '#0f172a' }}>{item.name}</td>
                        <td style={{ padding: '10px' }}>{item.company_name}</td>
                        <td style={{ padding: '10px', fontWeight: '800' }}>₹ {parseFloat(item.revenue || 0).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', background: '#fef3c7', color: '#b45309' }}>
                            {item.invoice_status}
                          </span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button 
                            onClick={() => setPaymentModalCandidate(item)}
                            style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                          >
                            Mark as Paid ✅
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === 'audit' && userRole === 'Partner' && (
          <div className="animated-container glass-card" style={{ padding: '20px', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>🛡️ Partner Audit Trail & Activity Logs</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px' }}>Timestamp</th>
                    <th style={{ padding: '10px' }}>Partner Email</th>
                    <th style={{ padding: '10px' }}>Action Type</th>
                    <th style={{ padding: '10px' }}>Candidate Name</th>
                    <th style={{ padding: '10px' }}>Company</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No audit logs recorded yet.</td></tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px', color: '#64748b' }}>{new Date(log.action_timestamp).toLocaleString()}</td>
                        <td style={{ padding: '10px', fontWeight: '700', color: '#0f172a' }}>{log.partner_email}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', background: log.action_type === 'DELETE' ? '#fee2e2' : '#e0e7ff', color: log.action_type === 'DELETE' ? '#dc2626' : '#4f46e5' }}>
                            {log.action_type}
                          </span>
                        </td>
                        <td style={{ padding: '10px', fontWeight: '700' }}>{log.candidate_name}</td>
                        <td style={{ padding: '10px' }}>{log.candidate_company}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL 1: CONFIRMATION POPUP FOR ADD/EDIT/DELETE */}
        {pendingAction && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
            <div className="glass-card animated-modal" style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>⚠️ Confirm Action</h3>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>{pendingAction.message}</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setPendingAction(null)}
                  style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={executeConfirmedAction}
                  style={{ flex: 1, padding: '10px', background: pendingAction.type === 'DELETE' ? '#dc2626' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: MARK AS PAID PAYMENT MODAL */}
        {paymentModalCandidate && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
            <div className="glass-card animated-modal" style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>💰 Mark Invoice as Paid</h3>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Candidate: <strong>{paymentModalCandidate.name}</strong> ({paymentModalCandidate.company_name})</p>

              <form onSubmit={handleMarkAsPaidSubmit}>
                <div style={{ marginBottom: '12px', textAlign: 'left' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Payment Date</label>
                  <input 
                    type="date" 
                    value={paymentDateInput} 
                    onChange={(e) => setPaymentDateInput(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '18px', textAlign: 'left' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Payment Mode</label>
                  <select 
                    value={paymentModeInput} 
                    onChange={(e) => setPaymentModeInput(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="NEFT">NEFT</option>
                    <option value="IMPS">IMPS</option>
                    <option value="RTGS">RTGS</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => setPaymentModalCandidate(null)}
                    style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    style={{ flex: 1, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Save & Mark Paid ✅
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: BATCH INVOICE MODAL */}
        {showInvoiceModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
            <div className="glass-card animated-modal" style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>📄 Raise Batch Invoice</h3>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Generating invoice for {selectedForBatchInvoice.length} selected candidates.</p>

              <form onSubmit={handleBatchInvoiceSubmit}>
                <div style={{ marginBottom: '18px', textAlign: 'left' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Invoice Number *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. INV-2026-001" 
                    value={batchInvoiceNumber} 
                    onChange={(e) => setBatchInvoiceNumber(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowInvoiceModal(false)}
                    style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    style={{ flex: 1, padding: '10px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Generate Invoice 🚀
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
