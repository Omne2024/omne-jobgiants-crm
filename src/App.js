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
  
  // Pagination State Added
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  
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

  // Reset pagination on search or filter change
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
  const totalPages = Math.ceil(filteredCandidates.length / rowsPerPage) || 1;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentCandidates = filteredCandidates.slice(indexOfFirstRow, indexOfLastRow);

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
              <h2 style={{ margin: '0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Omne JobGiants India Private Limited</h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                Logged in as: <strong style={{ color: '#4f46e5' }}>{userRole}</strong> ({loginEmail})
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {userRole === 'Partner' && (
              <label style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📷 Update Logo</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              </label>
            )}
            
            {userRole === 'Partner' && (
              <button onClick={() => setActiveTab('audit')} style={{ background: activeTab === 'audit' ? '#4f46e5' : '#f8fafc', color: activeTab === 'audit' ? '#fff' : '#334155', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                🛡️ Audit Logs ({auditLogs.length})
              </button>
            )}

            <button onClick={() => setActiveTab('dashboard')} style={{ background: activeTab === 'dashboard' ? '#4f46e5' : '#f8fafc', color: activeTab === 'dashboard' ? '#fff' : '#334155', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
              📊 Dashboard / CRM
            </button>

            <button onClick={() => setIsLoggedIn(false)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
              Logout 🚪
            </button>
          </div>
        </div>

        {/* Tab 1: Audit Logs (Partner Only) */}
        {activeTab === 'audit' && userRole === 'Partner' ? (
          <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>🛡️ Partner Edit & Deletion Audit Logs</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px' }}>Timestamp</th>
                    <th style={{ padding: '10px' }}>Partner Email</th>
                    <th style={{ padding: '10px' }}>Action Type</th>
                    <th style={{ padding: '10px' }}>Candidate Name</th>
                    <th style={{ padding: '10px' }}>Company Name</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No audit logs recorded yet.</td>
                    </tr>
                  ) : (
                    auditLogs.map((log, idx) => (
                      <tr key={log.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', color: '#64748b' }}>{new Date(log.action_timestamp).toLocaleString()}</td>
                        <td style={{ padding: '10px', fontWeight: '600' }}>{log.partner_email}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', background: log.action_type === 'EDIT' ? '#e0e7ff' : '#fee2e2', color: log.action_type === 'EDIT' ? '#3730a3' : '#b91c1c' }}>
                            {log.action_type}
                          </span>
                        </td>
                        <td style={{ padding: '10px', fontWeight: '700', color: '#0f172a' }}>{log.candidate_name}</td>
                        <td style={{ padding: '10px' }}>{log.candidate_company}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Tab 2: Main Dashboard & CRM */
          <div>
            
            {/* Top KPI Banner */}
            <div className="responsive-stats">
              <div className="glass-card" style={{ padding: '16px 20px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Active Revenue</p>
                  <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Rs. {totalRevenue.toLocaleString('en-IN')}</h3>
                </div>
                <div style={{ padding: '10px', background: '#e0e7ff', borderRadius: '10px', fontSize: '18px' }}>💰</div>
              </div>

              <div className="glass-card" style={{ padding: '16px 20px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Lateral Selections (Rev ≥ 30k)</p>
                  <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{lateralHiringCount}</h3>
                </div>
                <div style={{ padding: '10px', background: '#dcfce7', borderRadius: '10px', fontSize: '18px' }}>🚀</div>
              </div>
            </div>

            {/* Main CRM Grid Layout */}
            <div className="responsive-grid">
              
              {/* Left Column: Add / Edit Form */}
              <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', height: 'fit-content' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                    {isEditing ? '✏️ Edit Candidate Record' : '➕ Add New Candidate'}
                  </h3>
                  {isEditing && (
                    <button onClick={() => { setIsEditing(false); setFormData({ name: '', email: '', phone: '', recruiter: userRole === 'HR' ? (hrDatabase[loginEmail.trim().toLowerCase()]?.name) : '', company_name: '', process_name: '', client_poc: '', selection_date: '', joining_date: '', revenue: '', status: 'Yet to Join', invoice_status: 'Pending', invoice_number: '', payment_date: '', payment_mode: 'NEFT', notes: '' }); }} style={{ background: '#f1f5f9', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', color: '#475569' }}>
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
                    <input type="email" placeholder="candidate@email.com..." value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Phone Number</label>
                    <input type="text" placeholder="9876543210..." value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Company Name *</label>
                    <select value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} required className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      <option value="">-- Select Company --</option>
                      {predefinedCompanies.map((comp, idx) => (
                        <option key={idx} value={comp}>{comp}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Process Name</label>
                    <input type="text" placeholder="e.g. US Voice, Chat Process..." value={formData.process_name} onChange={(e) => setFormData({...formData, process_name: e.target.value})} className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Client POC Name</label>
                    <input type="text" placeholder="HR Manager POC..." value={formData.client_poc} onChange={(e) => setFormData({...formData, client_poc: e.target.value})} className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>

                  {userRole === 'Partner' ? (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Internal Recruiter *</label>
                      <select value={isOtherSelected ? 'Other' : formData.recruiter} onChange={(e) => {
                        if (e.target.value === 'Other') {
                          setIsOtherSelected(true);
                          setFormData({...formData, recruiter: ''});
                        } else {
                          setIsOtherSelected(false);
                          setFormData({...formData, recruiter: e.target.value});
                        }
                      }} required className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                        <option value="">-- Select Recruiter --</option>
                        {predefinedHRs.map((hr, idx) => (
                          <option key={idx} value={hr}>{hr}</option>
                        ))}
                        <option value="Other">Other (Type manually)</option>
                      </select>
                      {isOtherSelected && (
                        <input type="text" placeholder="Type recruiter name..." value={otherRecruiterInput} onChange={(e) => { setOtherRecruiterInput(e.target.value); setFormData({...formData, recruiter: e.target.value}); }} required className="modern-input" style={{ width: '100%', marginTop: '6px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                      )}
                    </div>
                  ) : (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Internal Recruiter</label>
                      <input type="text" value={currentLoggedInHRName} disabled style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f1f5f9', color: '#64748b', boxSizing: 'border-box' }} />
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Selection Date</label>
                      <input type="date" value={formData.selection_date} onChange={(e) => setFormData({...formData, selection_date: e.target.value})} className="modern-input" style={{ width: '100%', padding: '8px 6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Joining Date</label>
                      <input type="date" value={formData.joining_date} onChange={(e) => setFormData({...formData, joining_date: e.target.value})} className="modern-input" style={{ width: '100%', padding: '8px 6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  {userRole === 'Partner' && (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>Revenue (Rs.) *</label>
                      <input type="number" placeholder="e.g. 35000..." value={formData.revenue} onChange={(e) => setFormData({...formData, revenue: e.target.value})} required className="modern-input" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
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
                    <textarea placeholder="Add remarks..." value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="modern-input" rows="2" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>

                  <button type="submit" style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                    {isEditing ? 'Update Record 💾' : 'Submit Candidate 🚀'}
                  </button>
                </form>
              </div>

              {/* Right Column: Candidate Database Table & Filters */}
              <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
                
                {/* Header & Search Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Candidate Management & Placement Records</h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>Showing 15 candidates per page across portals</p>
                  </div>

                  {userRole === 'Partner' && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button onClick={downloadSampleCSV} style={{ padding: '6px 10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', color: '#334155' }}>
                        📥 Sample CSV
                      </button>
                      <label style={{ padding: '6px 10px', background: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', color: '#3730a3' }}>
                        📤 Bulk Upload CSV
                        <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                      </label>
                      <button onClick={sendMonthlyReportEmail} style={{ padding: '6px 10px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', color: '#166534' }}>
                        📧 Monthly Report
                      </button>
                    </div>
                  )}
                </div>

                {/* Filters Row */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <input 
                    type="text" 
                    placeholder="Search candidate, recruiter, company..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="modern-input"
                    style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />

                  <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', fontWeight: '600' }}>
                    <option value="All">Stage: All</option>
                    <option value="Yet to Join">Yet to Join</option>
                    <option value="Selected">Selected</option>
                    <option value="Joined">Joined</option>
                    <option value="Dropped">Dropped</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  <select value={filterInvoiceStatus} onChange={(e) => setFilterInvoiceStatus(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', fontWeight: '600' }}>
                    <option value="All">Invoice: All</option>
                    <option value="Pending">Pending</option>
                    <option value="Ready to Invoice">Ready to Invoice</option>
                    <option value="Invoice Raised / Pending Clearance">Invoice Raised</option>
                    <option value="Paid">Paid</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  {userRole === 'Partner' && (
                    <select value={filterHR} onChange={(e) => setFilterHR(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', fontWeight: '600' }}>
                      <option value="All">HR: All</option>
                      {allRecruiters.map((hrName, idx) => (
                        <option key={idx} value={hrName}>{hrName}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Candidate Table View */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '10px' }}>Sr. No.</th>
                        <th style={{ padding: '10px' }}>Candidate</th>
                        <th style={{ padding: '10px' }}>Company</th>
                        <th style={{ padding: '10px' }}>Recruiter</th>
                        <th style={{ padding: '10px' }}>Stage</th>
                        <th style={{ padding: '10px' }}>Invoice</th>
                        {userRole === 'Partner' && <th style={{ padding: '10px' }}>Revenue</th>}
                        <th style={{ padding: '10px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentCandidates.length === 0 ? (
                        <tr>
                          <td colSpan={userRole === 'Partner' ? 8 : 7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                            No candidate records found matching your filters.
                          </td>
                        </tr>
                      ) : (
                        currentCandidates.map((item, index) => {
                          const actualIndex = indexOfFirstRow + index + 1;
                          return (
                            <tr key={item.id || index} className="hover-effect" style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px', fontWeight: '700', color: '#64748b' }}>{actualIndex}</td>
                              <td style={{ padding: '10px' }}>
                                <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.name}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>{item.phone || item.email || 'No contact'}</div>
                              </td>
                              <td style={{ padding: '10px' }}>
                                <div style={{ fontWeight: '600', color: '#334155' }}>{item.company_name}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>{item.process_name || 'N/A'}</div>
                              </td>
                              <td style={{ padding: '10px', fontWeight: '600' }}>{item.recruiter}</td>
                              <td style={{ padding: '10px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', background: item.status === 'Joined' ? '#dcfce7' : item.status === 'Selected' ? '#e0e7ff' : '#fef9c3', color: item.status === 'Joined' ? '#166534' : item.status === 'Selected' ? '#3730a3' : '#854d0e' }}>
                                  {item.status}
                                </span>
                              </td>
                              <td style={{ padding: '10px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: item.invoice_status === 'Paid' ? '#166534' : '#475569' }}>
                                  {item.invoice_status}
                                </span>
                              </td>
                              {userRole === 'Partner' && (
                                <td style={{ padding: '10px', fontWeight: '700', color: '#0f172a' }}>
                                  Rs. {parseFloat(item.revenue || 0).toLocaleString('en-IN')}
                                </td>
                              )}
                              <td style={{ padding: '10px' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button onClick={() => handleEditClick(item)} style={{ padding: '4px 8px', background: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '11px' }}>Edit</button>
                                  <button onClick={() => handleDeleteCandidate(item, item.created_at)} style={{ padding: '4px 8px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '11px' }}>Delete</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 4px', marginTop: '14px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                    Showing {filteredCandidates.length === 0 ? 0 : indexOfFirstRow + 1} to {Math.min(indexOfLastRow, filteredCandidates.length)} of {filteredCandidates.length} candidates (Page {currentPage} of {totalPages})
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                      disabled={currentPage === 1}
                      style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f1f5f9' : '#fff', color: currentPage === 1 ? '#94a3b8' : '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>

                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155', padding: '0 6px' }}>
                      Page {currentPage} / {totalPages}
                    </span>

                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                      disabled={currentPage === totalPages || totalPages === 0}
                      style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', background: (currentPage === totalPages || totalPages === 0) ? '#f1f5f9' : '#fff', color: (currentPage === totalPages || totalPages === 0) ? '#94a3b8' : '#334155', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>

      {/* Confirmation Modal */}
      {pendingAction && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="animated-modal" style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '340px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Confirm Action</h4>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>{pendingAction.message}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setPendingAction(null)} style={{ padding: '8px 16px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
              <button onClick={executeConfirmedAction} style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
