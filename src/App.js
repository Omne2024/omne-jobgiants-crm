import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';

const SUPABASE_URL = 'https://okreuewrtorwkyidoawx.supabase.co/';
const SUPABASE_ANON_KEY = 'sb_publishable_Iznkoy_uNvS3-dqziX6KYQ_tKS6mvb0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [session] = useState({ user: { email: 'suraj.jha@jobgiants.in' } });
  const [userRole] = useState('Partner');

  const [candidates, setCandidates] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const [companyLogo, setCompanyLogo] = useState(() => {
    return localStorage.getItem('crm_custom_logo') || 'https://www.jobgiants.in/wp-content/uploads/2023/10/cropped-Logo-1.png';
  });
  
  const predefinedHRs = ['Sanchi', 'Sadaf', 'Anjali', 'Shrey'];
  const predefinedCompanies = ['Transom', 'HGS', 'iQor', 'Atain', 'Vertex Group', 'Shaadi.com', 'iEnergizer'];

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
  
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [paymentModalCandidate, setPaymentModalCandidate] = useState(null);
  const [paymentDateInput, setPaymentDateInput] = useState('');
  const [paymentModeInput, setPaymentModeInput] = useState('NEFT');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Image = event.target.result;
      setCompanyLogo(base64Image);
      localStorage.setItem('crm_custom_logo', base64Image);
      alert("Logo successfully update ho gaya hai!");
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

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    let finalRecruiter = isOtherSelected ? otherRecruiterInput.trim() : formData.recruiter;
    if (!finalRecruiter) {
      alert("Kripya Internal HR ka naam select karein ya enter karein.");
      return;
    }

    let updatedInvoiceStatus = formData.invoice_status;
    if (formData.status === 'Dropped' || formData.status === 'Rejected') {
      updatedInvoiceStatus = 'Cancelled';
    }

    const payload = {
      ...formData,
      selection_date: formData.selection_date || null,
      recruiter: finalRecruiter,
      invoice_status: updatedInvoiceStatus
    };

    let response;
    if (isEditing) {
      response = await supabase.from('candidates').update(payload).eq('id', currentId);
    } else {
      response = await supabase.from('candidates').insert([payload]);
    }

    if (response && response.error) {
      console.error("Supabase Save Error:", response.error);
      alert("Save nahi ho paya: " + response.error.message);
    } else {
      setFormData({ 
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
      alert("Payment update karne mein error aaya: " + error.message);
    } else {
      alert("Invoice successfully marked as Paid!");
      setPaymentModalCandidate(null);
      setPaymentDateInput('');
      fetchCandidates();
    }
  };

  const handleDeleteCandidate = async (id) => {
    if (window.confirm("Kya aap sach mein is candidate ko delete karna chahte hain?")) {
      const { error } = await supabase.from('candidates').delete().eq('id', id);
      if (error) {
        alert("Delete nahi ho paya: " + error.message);
      } else {
        fetchCandidates();
      }
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "name,email,phone,company_name,process_name,client_poc,recruiter,selection_date,joining_date,revenue,status,notes\n"
      + "Rahul Sharma,rahul@email.com,9876543210,Transom,US Voice,Mr. Ramesh,Sanchi,,2026-10-15,35000,Joined,Joining confirmed\n"
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

        batchData.push({
          name: obj.name || 'Unknown',
          email: obj.email || '',
          phone: obj.phone || '',
          company_name: obj.company_name || 'Transom',
          process_name: obj.process_name || 'General',
          client_poc: obj.client_poc || '',
          recruiter: obj.recruiter ? obj.recruiter.trim() : 'Sanchi',
          selection_date: obj.selection_date || null,
          joining_date: obj.joining_date || new Date().toISOString().split('T')[0],
          revenue: obj.revenue || 0,
          status: statusVal,
          invoice_status: invStatus,
          notes: obj.notes || ''
        });
      }

      if (batchData.length > 0) {
        const { error } = await supabase.from('candidates').insert(batchData);
        if (error) {
          alert("Bulk upload mein error aaya: " + error.message);
        } else {
          alert(`Successfully ${batchData.length} candidates upload ho gaye hain!`);
          fetchCandidates();
        }
      } else {
        alert("File mein valid data nahi mila ya format galat hai.");
      }
    };
    reader.readAsText(file);
  };

  const sendMonthlyReportEmail = () => {
    const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Calculate summary metrics
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

    const recipientTo = 'suraj.jha@jobgiants.in';
    const recipientCc = 'garimabansal@jobgiants.in';
    const subject = encodeURIComponent(`Monthly Recruitment Report - ${currentMonthName} [JobGiants CRM]`);
    const body = encodeURIComponent(emailBody);

    const mailtoLink = `mailto:${recipientTo}?cc=${recipientCc}&subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
  };

  const generateInvoicePDF = (candidate) => {
    if (candidate.status === 'Dropped' || candidate.status === 'Rejected') {
      alert("Dropped ya Rejected candidate ka invoice generate nahi kiya ja sakta.");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('OMNE JOBGIANTS CONSULTANCY SERVICES', 14, 22);
    doc.setFontSize(10);
    doc.text('Recruitment & Talent Acquisition Solutions', 14, 28);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 28);
    doc.line(14, 32, 196, 32);

    doc.setFontSize(14);
    doc.text('PLACEMENT INVOICE', 14, 45);
    doc.setFontSize(11);
    doc.text(`Candidate Name: ${candidate.name}`, 14, 58);
    doc.text(`Email: ${candidate.email || 'N/A'} | Phone: ${candidate.phone || 'N/A'}`, 14, 66);
    doc.text(`Client Company: ${candidate.company_name || 'N/A'} (POC: ${candidate.client_poc || 'N/A'})`, 14, 74);
    doc.text(`Process Name: ${candidate.process_name || 'N/A'}`, 14, 82);
    doc.text(`Internal HR Assigned: ${candidate.recruiter}`, 14, 90);
    doc.text(`Selection Date: ${candidate.selection_date || 'N/A'}`, 14, 98);
    doc.text(`Joining Date: ${candidate.joining_date}`, 14, 106);

    doc.setFillColor(240, 240, 240);
    doc.rect(14, 114, 182, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 18, 120);
    doc.text('Amount (INR)', 150, 120);

    doc.setFont('helvetica', 'normal');
    doc.text(`Recruitment Fee for ${candidate.name}`, 18, 132);
    doc.text(`Rs. ${parseFloat(candidate.revenue || 0).toLocaleString('en-IN')}`, 150, 132);

    doc.line(14, 142, 196, 142);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount Due:', 100, 150);
    doc.text(`Rs. ${parseFloat(candidate.revenue || 0).toLocaleString('en-IN')}`, 150, 150);

    doc.save(`Invoice_${candidate.name.replace(/\s+/g, '_')}.pdf`);
  };

  const allRecruiters = Array.from(new Set([...predefinedHRs, ...candidates.map(item => item.recruiter)])).filter(Boolean);
  const readyToInvoiceList = candidates.filter(item => item.invoice_status === 'Ready to Invoice');

  const totalRevenue = candidates
    .filter(item => (filterHR === 'All' || item.recruiter === filterHR))
    .filter(item => item.status !== 'Dropped' && item.status !== 'Rejected')
    .reduce((acc, curr) => acc + (parseFloat(curr.revenue) || 0), 0);
  
  const lateralHiringCount = candidates
    .filter(item => (filterHR === 'All' || item.recruiter === filterHR))
    .filter(item => item.status !== 'Dropped' && item.status !== 'Rejected' && parseFloat(item.revenue || 0) >= 30000).length;

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
    const matchesHR = filterHR === 'All' || item.recruiter === filterHR;

    return matchesSearch && matchesStatus && matchesStage && matchesHR;
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
      monthlyData[monthKey].recruiters[recName] = { joined: 0, dropped: 0 };
    }

    if (item.status !== 'Dropped' && item.status !== 'Rejected') {
      monthlyData[monthKey].totalRevenue += rev;
    }

    if (item.status === 'Joined') {
      monthlyData[monthKey].joinedCount += 1;
      monthlyData[monthKey].recruiters[recName].joined += 1;
    } else if (item.status === 'Dropped' || item.status === 'Rejected') {
      monthlyData[monthKey].droppedCount += 1;
      monthlyData[monthKey].recruiters[recName].dropped += 1;
    }
  });

  return (
    <div style={{ position: 'relative', padding: '20px', fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#f1f5f9', minHeight: '100vh', overflowX: 'hidden' }}>
      
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
          background: rgba(255, 255, 255, 0.85);
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
          grid-template-columns: 1fr 2.9fr;
          gap: 24px;
        }
        .responsive-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        @media (max-width: 1024px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
          }
          .responsive-stats {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Background Watermark Logo */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        height: '400px',
        backgroundImage: `url("${companyLogo}")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
        opacity: 0.04,
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div className="animated-container" style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Modern Header Navbar */}
        <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '4px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', borderRadius: '50%', display: 'flex' }}>
              <img src={companyLogo} alt="Logo" style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', background: 'linear-gradient(to right, #1e293b, #475569)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Omne JobGiants Consultancy
              </h1>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                Enterprise Recruitment CRM • <strong style={{ color: '#4f46e5' }}>{userRole} Mode</strong>
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={sendMonthlyReportEmail} 
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)' }}
              title="Send monthly report to Suraj & Garima"
            >
              📧 Send Monthly Report
            </button>

            <label style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🖼 Logo
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </label>

            <button 
              onClick={downloadSampleCSV} 
              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              📥 Template
            </button>

            <label style={{ background: '#0284c7', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)' }}>
              📁 Import CSV
              <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '10px', gap: '2px' }}>
              <button 
                onClick={() => setActiveTab('dashboard')} 
                style={{ padding: '6px 14px', background: activeTab === 'dashboard' ? '#fff' : 'transparent', color: activeTab === 'dashboard' ? '#0f172a' : '#64748b', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', boxShadow: activeTab === 'dashboard' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}>
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('reports')} 
                style={{ padding: '6px 14px', background: activeTab === 'reports' ? '#fff' : 'transparent', color: activeTab === 'reports' ? '#0f172a' : '#64748b', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', boxShadow: activeTab === 'reports' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}>
                Reports
              </button>
            </div>
          </div>
        </div>

        {/* Ready to Invoice Notification Alert */}
        {readyToInvoiceList.length > 0 && (
          <div className="invoice-alert" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '1px solid #f59e0b', padding: '14px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚡</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#92400e' }}>
                Action Required: {readyToInvoiceList.length} candidate(s) have crossed 90 days (91st day reached). Invoices are ready for collection!
              </span>
            </div>
            <button 
              onClick={() => setFilterInvoiceStatus('Ready to Invoice')} 
              style={{ background: '#d97706', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 4px rgba(217, 119, 6, 0.3)' }}>
              Filter Ready Invoices
            </button>
          </div>
        )}

        {activeTab === 'reports' ? (
          <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>Month-wise Revenue & Internal HR Performance</h2>
            {Object.keys(monthlyData).length === 0 ? (
              <p style={{ color: '#64748b' }}>No data records found.</p>
            ) : (
              Object.keys(monthlyData).map((month) => {
                const mData = monthlyData[month];
                return (
                  <div key={month} style={{ marginBottom: '25px', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                      <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '16px', fontWeight: '700' }}>📅 {month}</h3>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '12px', fontWeight: '700', flexWrap: 'wrap' }}>
                        <span style={{ background: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: '8px' }}>Revenue: Rs. {mData.totalRevenue.toLocaleString('en-IN')}</span>
                        <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 10px', borderRadius: '8px' }}>Joined: {mData.joinedCount}</span>
                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '8px' }}>Dropped: {mData.droppedCount}</span>
                      </div>
                    </div>

                    <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#475569', fontWeight: '600' }}>Internal HR Performance Breakdown:</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '400px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#475569' }}>
                            <th style={{ padding: '10px 12px', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px' }}>HR Name</th>
                            <th style={{ padding: '10px 12px' }}>Joined Candidates</th>
                            <th style={{ padding: '10px 12px', borderTopRightRadius: '6px', borderBottomRightRadius: '6px' }}>Dropped / Rejected</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.keys(mData.recruiters).map((rec) => {
                            const recStats = mData.recruiters[rec];
                            return (
                              <tr key={rec} className="hover-effect" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 12px', fontWeight: '700', color: '#1e293b' }}>👤 {rec}</td>
                                <td style={{ padding: '10px 12px', color: '#059669', fontWeight: '700' }}>{recStats.joined} Joined</td>
                                <td style={{ padding: '10px 12px', color: '#dc2626', fontWeight: '700' }}>{recStats.dropped} Dropped</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <>
            {userRole === 'Partner' && (
              <div className="responsive-stats">
                <div style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.3)' }}>
                  <h3 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, fontWeight: '700' }}>
                    {filterHR === 'All' ? 'Active Revenue Pipeline' : `Revenue (${filterHR})`}
                  </h3>
                  <p style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: '800' }}>Rs. {totalRevenue.toLocaleString('en-IN')}</p>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)' }}>
                  <h3 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, fontWeight: '700' }}>
                    {filterHR === 'All' ? 'Active Lateral Hirings (≥ 30k)' : `Lateral Hirings (${filterHR})`}
                  </h3>
                  <p style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: '800' }}>{lateralHiringCount} Candidates</p>
                </div>
              </div>
            )}

            <div className="responsive-grid">
              
              {/* Form Card */}
              <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', height: 'fit-content' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  {isEditing ? '✏️ Edit Candidate Record' : '➕ Add New Candidate'}
                </h3>
                <form onSubmit={handleFormSubmit}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Candidate Name *</label>
                    <input type="text" className="modern-input" placeholder="e.g. Rahul Sharma" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Email Address</label>
                    <input type="email" className="modern-input" placeholder="candidate@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Phone Number</label>
                    <input type="text" className="modern-input" placeholder="9876543210" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Company Name *</label>
                    <select 
                      className="modern-input"
                      value={formData.company_name} 
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} 
                      required 
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#fff', fontSize: '13px' }}
                    >
                      <option value="" disabled>-- Select Client Company --</option>
                      {predefinedCompanies.map(comp => (
                        <option key={comp} value={comp}>{comp}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Process Name *</label>
                    <input type="text" className="modern-input" placeholder="e.g. US Voice / Chat" value={formData.process_name} onChange={(e) => setFormData({ ...formData, process_name: e.target.value })} required style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Client POC (Point of Contact)</label>
                    <input type="text" className="modern-input" placeholder="e.g. Mr. Ramesh" value={formData.client_poc} onChange={(e) => setFormData({ ...formData, client_poc: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }} />
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Internal HR Name *</label>
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
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#fff', fontSize: '13px' }}
                    >
                      <option value="" disabled>-- Select Internal HR --</option>
                      {predefinedHRs.map(hr => (
                        <option key={hr} value={hr}>{hr}</option>
                      ))}
                      <option value="Other">➕ Other (Type new HR)</option>
                    </select>

                    {isOtherSelected && (
                      <input 
                        type="text" 
                        className="modern-input"
                        placeholder="Enter new HR name..." 
                        value={otherRecruiterInput} 
                        onChange={(e) => setOtherRecruiterInput(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #6366f1', boxSizing: 'border-box', marginTop: '8px', fontSize: '13px' }} 
                      />
                    )}
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Selection Date (Optional)</label>
                    <input type="date" className="modern-input" value={formData.selection_date} onChange={(e) => setFormData({ ...formData, selection_date: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Joining Date *</label>
                    <input type="date" className="modern-input" value={formData.joining_date} onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })} required style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Revenue (INR) *</label>
                    <input type="number" className="modern-input" placeholder="e.g. 35000" value={formData.revenue} onChange={(e) => setFormData({ ...formData, revenue: e.target.value })} required style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Candidate Status (Stage)</label>
                    <select className="modern-input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px', backgroundColor: '#fff' }}>
                      <option value="Yet to Join">Yet to Join</option>
                      <option value="Selected">Selected</option>
                      <option value="Joined">Joined</option>
                      <option value="Dropped">Dropped (Left before 90 days)</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Follow-up Notes / Remarks</label>
                    <textarea 
                      className="modern-input"
                      placeholder="e.g. Called on Monday, joining confirmed..." 
                      value={formData.notes} 
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                      rows="2"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', resize: 'vertical', fontSize: '13px' }} 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)' }}>
                      {isEditing ? 'Update Candidate' : 'Save Candidate'}
                    </button>
                    {isEditing && (
                      <button type="button" onClick={() => { setIsEditing(false); setCurrentId(null); setIsOtherSelected(false); setFormData({ name: '', email: '', phone: '', recruiter: '', company_name: '', process_name: '', client_poc: '', selection_date: '', joining_date: '', revenue: '', status: 'Yet to Join', invoice_status: 'Pending', payment_date: '', payment_mode: 'NEFT', notes: '' }); }} style={{ padding: '10px 14px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Table Card */}
              <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Candidates Directory ({filteredCandidates.length})</h3>
                  
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                    <input type="text" className="modern-input" placeholder="Search name, company, POC..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: '1', minWidth: '130px', fontSize: '12px' }} />
                    
                    <select className="modern-input" value={filterHR} onChange={(e) => setFilterHR(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: filterHR !== 'All' ? '#e0e7ff' : '#fff', fontWeight: filterHR !== 'All' ? '700' : '500', flex: '1', minWidth: '110px', fontSize: '12px' }}>
                      <option value="All">All HRs</option>
                      {allRecruiters.map(hr => (
                        <option key={hr} value={hr}>👤 {hr}</option>
                      ))}
                    </select>

                    <select className="modern-input" value={filterStage} onChange={(e) => setFilterStage(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: '1', minWidth: '100px', fontSize: '12px', backgroundColor: '#fff' }}>
                      <option value="All">All Stages</option>
                      <option value="Yet to Join">Yet to Join</option>
                      <option value="Selected">Selected</option>
                      <option value="Joined">Joined</option>
                      <option value="Dropped">Dropped</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#475569', fontWeight: '700' }}>
                        <th style={{ padding: '10px 12px', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>Candidate Name</th>
                        <th style={{ padding: '10px 12px' }}>Client & Process</th>
                        <th style={{ padding: '10px 12px' }}>Dates (Sel / Join)</th>
                        <th style={{ padding: '10px 12px' }}>Revenue</th>
                        <th style={{ padding: '10px 12px' }}>Stage</th>
                        <th style={{ padding: '10px 12px' }}>Invoice</th>
                        <th style={{ padding: '10px 12px', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map((item) => {
                        const rev = parseFloat(item.revenue || 0);
                        const isLateral = rev >= 30000 && item.status !== 'Dropped' && item.status !== 'Rejected';
                        
                        return (
                          <tr key={item.id} className="hover-effect" style={{ borderBottom: '1px solid #f1f5f9', opacity: (item.status === 'Dropped' || item.status === 'Rejected') ? 0.6 : 1 }}>
                            <td style={{ padding: '12px' }}>
                              <div 
                                onClick={() => setSelectedCandidate(item)} 
                                style={{ fontWeight: '700', color: '#4f46e5', cursor: 'pointer', textDecoration: 'none' }}
                                title="Click to view details"
                              >
                                {item.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>📞 {item.phone || 'N/A'}</div>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ fontWeight: '700', color: '#1e293b' }}>🏢 {item.company_name || 'N/A'}</div>
                              <div style={{ fontSize: '11px', color: '#475569' }}>Proc: {item.process_name || 'N/A'}</div>
                              <div style={{ fontSize: '10px', color: '#0284c7', fontWeight: '600' }}>POC: {item.client_poc || 'N/A'} • HR: {item.recruiter}</div>
                            </td>
                            <td style={{ padding: '12px', fontSize: '11px', color: '#475569' }}>
                              <div>Sel: {item.selection_date || 'N/A'}</div>
                              <div>Join: {item.joining_date}</div>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ fontWeight: '700', color: '#0f172a' }}>Rs. {rev.toLocaleString('en-IN')}</div>
                              {isLateral && (
                                <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', display: 'inline-block', marginTop: '2px' }}>
                                  Lateral
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ 
                                padding: '4px 10px', 
                                borderRadius: '20px', 
                                fontSize: '11px', 
                                fontWeight: '700', 
                                display: 'inline-block',
                                background: 
                                  item.status === 'Joined' ? '#d1fae5' : 
                                  item.status === 'Selected' ? '#e0e7ff' : 
                                  item.status === 'Dropped' ? '#fee2e2' : 
                                  item.status === 'Rejected' ? '#f1f5f9' : '#fef3c7',
                                color:
                                  item.status === 'Joined' ? '#065f46' : 
                                  item.status === 'Selected' ? '#3730a3' : 
                                  item.status === 'Dropped' ? '#991b1b' : 
                                  item.status === 'Rejected' ? '#475569' : '#b45309'
                              }}>
                                {item.status || 'Yet to Join'}
                              </span>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div>
                                <span style={{ 
                                  padding: '4px 10px', 
                                  borderRadius: '20px', 
                                  fontSize: '11px', 
                                  fontWeight: '700', 
                                  display: 'inline-block',
                                  background: 
                                    item.invoice_status === 'Paid' ? '#d1fae5' : 
                                    item.invoice_status === 'Ready to Invoice' ? '#fef3c7' : 
                                    item.invoice_status === 'Cancelled' ? '#fee2e2' : '#f1f5f9',
                                  color: 
                                    item.invoice_status === 'Paid' ? '#065f46' : 
                                    item.invoice_status === 'Cancelled' ? '#991b1b' : '#334155'
                                }}>
                                  {item.invoice_status}
                                </span>
                              </div>
                              {item.invoice_status === 'Paid' && (
                                <div style={{ fontSize: '10px', color: '#059669', marginTop: '4px', fontWeight: '600' }}>
                                  {item.payment_mode} ({item.payment_date})
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {item.invoice_status === 'Ready to Invoice' && (
                                  <button onClick={() => setPaymentModalCandidate(item)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Paid</button>
                                )}
                                {item.invoice_status !== 'Cancelled' && (
                                  <button onClick={() => generateInvoicePDF(item)} style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>PDF</button>
                                )}
                                <button onClick={() => { setIsEditing(true); setCurrentId(item.id); setFormData(item); setIsOtherSelected(false); }} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Edit</button>
                                <button onClick={() => handleDeleteCandidate(item.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Del</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </>
        )}

        {/* Mark as Paid Modal */}
        {paymentModalCandidate && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
            <div className="animated-modal glass-card" style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
              <h3 style={{ marginTop: 0, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', fontSize: '18px', fontWeight: '800' }}>Confirm Payment Received</h3>
              <form onSubmit={handleMarkAsPaidSubmit}>
                <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>Candidate: <strong style={{ color: '#0f172a' }}>{paymentModalCandidate.name}</strong> ({paymentModalCandidate.company_name})</p>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Payment Date *</label>
                  <input type="date" className="modern-input" value={paymentDateInput} onChange={(e) => setPaymentDateInput(e.target.value)} required style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Payment Mode *</label>
                  <select className="modern-input" value={paymentModeInput} onChange={(e) => setPaymentModeInput(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px', backgroundColor: '#fff' }}>
                    <option value="NEFT">NEFT</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" style={{ flex: 1, padding: '11px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}>
                    Mark as Paid
                  </button>
                  <button type="button" onClick={() => setPaymentModalCandidate(null)} style={{ padding: '11px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Candidate Detail View Modal */}
        {selectedCandidate && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
            <div className="animated-modal glass-card" style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
              <h3 style={{ marginTop: 0, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', fontSize: '18px', fontWeight: '800' }}>Candidate Profile</h3>
              <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#334155' }}>
                <p><strong>Name:</strong> {selectedCandidate.name}</p>
                <p><strong>Email:</strong> {selectedCandidate.email || 'N/A'}</p>
                <p><strong>Phone:</strong> {selectedCandidate.phone || 'N/A'}</p>
                <p><strong>Client Company:</strong> {selectedCandidate.company_name || 'N/A'}</p>
                <p><strong>Process:</strong> {selectedCandidate.process_name || 'N/A'}</p>
                <p><strong>Client POC:</strong> {selectedCandidate.client_poc || 'N/A'}</p>
                <p><strong>Internal HR:</strong> {selectedCandidate.recruiter || 'N/A'}</p>
                <p><strong>Selection Date:</strong> {selectedCandidate.selection_date || 'N/A'}</p>
                <p><strong>Joining Date:</strong> {selectedCandidate.joining_date || 'N/A'}</p>
                <p><strong>Revenue:</strong> Rs. {parseFloat(selectedCandidate.revenue || 0).toLocaleString('en-IN')}</p>
                <p><strong>Status:</strong> {selectedCandidate.status}</p>
                <p><strong>Invoice Status:</strong> {selectedCandidate.invoice_status}</p>
                {selectedCandidate.notes && <p><strong>Notes/Remarks:</strong> {selectedCandidate.notes}</p>}
              </div>
              <button onClick={() => setSelectedCandidate(null)} style={{ marginTop: '20px', width: '100%', padding: '11px', background: '#475569', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                Close Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
