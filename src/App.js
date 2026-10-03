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

  // Payment Modal State for marking invoice as Paid
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
    const { data, error } = await query.order('selection_date', { ascending: false });

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
        } else if (diffDays >= 90 && currentInvoiceStatus === 'Pending') {
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
          selection_date: obj.selection_date || new Date().toISOString().split('T')[0],
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

  // Ready to Invoice notifications count (90+ days pending invoices that are not paid)
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
    const dateToUse = item.selection_date || item.joining_date;
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
    <div style={{ position: 'relative', padding: '15px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh', overflowX: 'hidden' }}>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseAlert {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        .animated-container {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animated-modal {
          animation: zoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .invoice-alert {
          animation: pulseAlert 1.5s infinite;
        }
        button, label {
          transition: all 0.2s ease-in-out;
        }
        button:hover, label:hover {
          transform: translateY(-2px);
          filter: brightness(1.05);
        }
        button:active, label:active {
          transform: translateY(0);
        }
        tr.hover-effect:hover {
          background-color: #f1f5f9 !important;
        }

        .responsive-grid {
          display: grid;
          grid-template-columns: 1fr 2.8fr;
          gap: 20px;
        }
        .responsive-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        @media (max-width: 900px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
          }
          .responsive-stats {
            grid-template-columns: 1fr !important;
          }
          h1 {
            font-size: 18px !important;
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
        opacity: 0.05,
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div className="animated-container" style={{ position: 'relative', zIndex: 1 }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={companyLogo} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#f3f4f6' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '20px' }}>Omne JobGiants Consultancy Services</h1>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                Direct Access Mode | <strong>Role: {userRole}</strong>
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-start' }}>
            
            <label style={{ backgroundColor: '#7c3aed', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              🖼️ Change Logo
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </label>

            <button 
              onClick={downloadSampleCSV} 
              style={{ backgroundColor: '#4b5563', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              📥 Template
            </button>

            <label style={{ backgroundColor: '#0284c7', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              📁 Upload CSV
              <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <button 
              onClick={() => setActiveTab('dashboard')} 
              style={{ padding: '6px 12px', backgroundColor: activeTab === 'dashboard' ? '#16a34a' : '#e5e7eb', color: activeTab === 'dashboard' ? '#fff' : '#374151', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('reports')} 
              style={{ padding: '6px 12px', backgroundColor: activeTab === 'reports' ? '#2563eb' : '#e5e7eb', color: activeTab === 'reports' ? '#fff' : '#374151', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>
              Reports
            </button>
          </div>
        </div>

        {/* 90-Days Payment Pending Notification Banner */}
        {readyToInvoiceList.length > 0 && (
          <div className="invoice-alert" style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', padding: '12px 15px', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🔔</span>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#92400e' }}>
                Notification: {readyToInvoiceList.length} candidate(s) ne 90 days pure kar liye hain aur unka invoice "Ready to Invoice" hai. Jab tak payment nahi milti, kripya follow-up karein!
              </span>
            </div>
            <button 
              onClick={() => setFilterInvoiceStatus('Ready to Invoice')} 
              style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
              View Ready Invoices
            </button>
          </div>
        )}

        {activeTab === 'reports' ? (
          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#1f2937', fontSize: '18px' }}>Month-wise Revenue & Internal HR Performance</h2>
            {Object.keys(monthlyData).length === 0 ? (
              <p style={{ color: '#6b7280' }}>Koi data available nahi hai.</p>
            ) : (
              Object.keys(monthlyData).map((month) => {
                const mData = monthlyData[month];
                return (
                  <div key={month} style={{ marginBottom: '25px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '15px', backgroundColor: '#fcfcfc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <h3 style={{ margin: 0, color: '#2563eb', fontSize: '16px' }}>📅 {month}</h3>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '12px', fontWeight: 'bold', flexWrap: 'wrap' }}>
                        <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '3px 8px', borderRadius: '6px' }}>Revenue: Rs. {mData.totalRevenue.toLocaleString('en-IN')}</span>
                        <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '6px' }}>Joined: {mData.joinedCount}</span>
                        <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '6px' }}>Dropped: {mData.droppedCount}</span>
                      </div>
                    </div>

                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#4b5563' }}>Internal HR Performance for {month}:</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '400px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
                            <th style={{ padding: '8px' }}>HR Name</th>
                            <th style={{ padding: '8px' }}>Joined</th>
                            <th style={{ padding: '8px' }}>Dropped</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.keys(mData.recruiters).map((rec) => {
                            const recStats = mData.recruiters[rec];
                            return (
                              <tr key={rec} className="hover-effect" style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: 'bold' }}>👤 {rec}</td>
                                <td style={{ padding: '8px', color: '#065f46', fontWeight: 'bold' }}>{recStats.joined} Joined</td>
                                <td style={{ padding: '8px', color: '#991b1b', fontWeight: 'bold' }}>{recStats.dropped} Dropped</td>
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
                <div style={{ backgroundColor: '#16a34a', color: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', opacity: 0.9 }}>
                    {filterHR === 'All' ? 'Active Revenue Pipeline' : `Revenue (${filterHR})`}
                  </h3>
                  <p style={{ margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold' }}>Rs. {totalRevenue.toLocaleString('en-IN')}</p>
                </div>
                <div style={{ backgroundColor: '#2563eb', color: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', opacity: 0.9 }}>
                    {filterHR === 'All' ? 'Active Lateral Hirings (≥ 30k)' : `Lateral Hirings (${filterHR})`}
                  </h3>
                  <p style={{ margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold' }}>{lateralHiringCount} Candidates</p>
                </div>
              </div>
            )}

            <div className="responsive-grid">
              
              {/* Add / Edit Candidate Form */}
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: 'fit-content' }}>
                <h3 style={{ marginTop: 0, fontSize: '16px' }}>{isEditing ? 'Edit Candidate / Status' : 'Add Candidate'}</h3>
                <form onSubmit={handleFormSubmit}>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Candidate Name *</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Email Address</label>
                    <input type="email" placeholder="candidate@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Phone Number</label>
                    <input type="text" placeholder="9876543210" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                  </div>

                  {/* Company Dropdown */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Company Name *</label>
                    <select 
                      value={formData.company_name} 
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} 
                      required 
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: '#fff' }}
                    >
                      <option value="" disabled>-- Select Client Company --</option>
                      {predefinedCompanies.map(comp => (
                        <option key={comp} value={comp}>{comp}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Process Name *</label>
                    <input type="text" placeholder="e.g. US Voice / Chat" value={formData.process_name} onChange={(e) => setFormData({ ...formData, process_name: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Client POC (Point of Contact)</label>
                    <input type="text" placeholder="e.g. Mr. Ramesh / Ms. Pooja" value={formData.client_poc} onChange={(e) => setFormData({ ...formData, client_poc: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                  </div>
                  
                  {/* Internal HR Dropdown */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Internal HR Name *</label>
                    <select 
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
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: '#fff' }}
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
                        placeholder="Enter new HR name..." 
                        value={otherRecruiterInput} 
                        onChange={(e) => setOtherRecruiterInput(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #0284c7', boxSizing: 'border-box', marginTop: '6px' }} 
                      />
                    )}
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Selection Date *</label>
                    <input type="date" value={formData.selection_date} onChange={(e) => setFormData({ ...formData, selection_date: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Joining Date *</label>
                    <input type="date" value={formData.joining_date} onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Revenue (INR) *</label>
                    <input type="number" placeholder="e.g. 35000" value={formData.revenue} onChange={(e) => setFormData({ ...formData, revenue: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Candidate Status (Stage)</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                      <option value="Yet to Join">Yet to Join</option>
                      <option value="Selected">Selected</option>
                      <option value="Joined">Joined</option>
                      <option value="Dropped">Dropped (Left before 90 days)</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  {/* Follow-up Notes / Remarks Box */}
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Follow-up Notes / Remarks</label>
                    <textarea 
                      placeholder="e.g. Called on Monday, joining confirmed..." 
                      value={formData.notes} 
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                      rows="2"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', resize: 'vertical' }} 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                      {isEditing ? 'Update Details' : 'Save Candidate'}
                    </button>
                    {isEditing && (
                      <button type="button" onClick={() => { setIsEditing(false); setCurrentId(null); setIsOtherSelected(false); setFormData({ name: '', email: '', phone: '', recruiter: '', company_name: '', process_name: '', client_poc: '', selection_date: '', joining_date: '', revenue: '', status: 'Yet to Join', invoice_status: 'Pending', payment_date: '', payment_mode: 'NEFT', notes: '' }); }} style={{ padding: '10px', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Candidates Table & Filters */}
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Candidates ({filteredCandidates.length})</h3>
                  
                  {/* Filters Container */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                    <input type="text" placeholder="Search name, company, POC..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', flex: '1', minWidth: '120px' }} />
                    
                    <select value={filterHR} onChange={(e) => setFilterHR(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: filterHR !== 'All' ? '#eff6ff' : '#fff', fontWeight: filterHR !== 'All' ? 'bold' : 'normal', flex: '1', minWidth: '110px' }}>
                      <option value="All">All HRs</option>
                      {allRecruiters.map(hr => (
                        <option key={hr} value={hr}>👤 {hr}</option>
                      ))}
                    </select>

                    <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', flex: '1', minWidth: '100px' }}>
                      <option value="All">All Stages</option>
                      <option value="Yet to Join">Yet to Join</option>
                      <option value="Selected">Selected</option>
                      <option value="Joined">Joined</option>
                      <option value="Dropped">Dropped</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Scrollable Table for Mobile */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>Candidate Name</th>
                        <th style={{ padding: '8px' }}>Client & Process</th>
                        <th style={{ padding: '8px' }}>Dates (Sel / Join)</th>
                        <th style={{ padding: '8px' }}>Revenue</th>
                        <th style={{ padding: '8px' }}>Stage</th>
                        <th style={{ padding: '8px' }}>Invoice</th>
                        <th style={{ padding: '8px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map((item) => {
                        const rev = parseFloat(item.revenue || 0);
                        const isLateral = rev >= 30000 && item.status !== 'Dropped' && item.status !== 'Rejected';
                        
                        return (
                          <tr key={item.id} className="hover-effect" style={{ borderBottom: '1px solid #e5e7eb', opacity: (item.status === 'Dropped' || item.status === 'Rejected') ? 0.6 : 1, transition: 'background-color 0.2s' }}>
                            <td style={{ padding: '8px' }}>
                              <div 
                                onClick={() => setSelectedCandidate(item)} 
                                style={{ fontWeight: 'bold', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                                title="Click to view details"
                              >
                                {item.name}
                              </div>
                              <div style={{ fontSize: '10px', color: '#4b5563' }}>📞 {item.phone || 'N/A'}</div>
                            </td>
                            <td style={{ padding: '8px' }}>
                              <div style={{ fontWeight: 'bold' }}>🏢 {item.company_name || 'N/A'}</div>
                              <div style={{ fontSize: '10px', color: '#4b5563' }}>Process: {item.process_name || 'N/A'}</div>
                              <div style={{ fontSize: '10px', color: '#0284c7' }}>POC: {item.client_poc || 'N/A'} | HR: {item.recruiter}</div>
                            </td>
                            <td style={{ padding: '8px', fontSize: '11px' }}>
                              <div>Sel: {item.selection_date || 'N/A'}</div>
                              <div>Join: {item.joining_date}</div>
                            </td>
                            <td style={{ padding: '8px' }}>
                              <div>Rs. {rev.toLocaleString('en-IN')}</div>
                              {isLateral && (
                                <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 4px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>
                                  Lateral
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px' }}>
                              <span style={{ 
                                padding: '3px 6px', 
                                borderRadius: '10px', 
                                fontSize: '10px', 
                                fontWeight: 'bold', 
                                backgroundColor: 
                                  item.status === 'Joined' ? '#d1fae5' : 
                                  item.status === 'Selected' ? '#e0e7ff' : 
                                  item.status === 'Dropped' ? '#fee2e2' : 
                                  item.status === 'Rejected' ? '#f3f4f6' : '#fef3c7',
                                color:
                                  item.status === 'Joined' ? '#065f46' : 
                                  item.status === 'Selected' ? '#3730a3' : 
                                  item.status === 'Dropped' ? '#991b1b' : 
                                  item.status === 'Rejected' ? '#374151' : '#b45309'
                              }}>
                                {item.status || 'Yet to Join'}
                              </span>
                            </td>
                            <td style={{ padding: '8px' }}>
                              <div>
                                <span style={{ 
                                  padding: '3px 6px', 
                                  borderRadius: '10px', 
                                  fontSize: '10px', 
                                  fontWeight: 'bold', 
                                  backgroundColor: 
                                    item.invoice_status === 'Paid' ? '#d1fae5' : 
                                    item.invoice_status === 'Ready to Invoice' ? '#fef3c7' : 
                                    item.invoice_status === 'Cancelled' ? '#fee2e2' : '#f3f4f6',
                                  color: 
                                    item.invoice_status === 'Paid' ? '#065f46' : 
                                    item.invoice_status === 'Cancelled' ? '#991b1b' : 'inherit'
                                }}>
                                  {item.invoice_status}
                                </span>
                              </div>
                              {item.invoice_status === 'Paid' && (
                                <div style={{ fontSize: '9px', color: '#059669', marginTop: '3px' }}>
                                  {item.payment_mode} ({item.payment_date})
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '8px' }}>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {item.invoice_status === 'Ready to Invoice' && (
                                  <button onClick={() => setPaymentModalCandidate(item)} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Mark Paid</button>
                                )}
                                {item.invoice_status !== 'Cancelled' && (
                                  <button onClick={() => generateInvoicePDF(item)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>PDF</button>
                                )}
                                <button onClick={() => { setIsEditing(true); setCurrentId(item.id); setFormData(item); setIsOtherSelected(false); }} style={{ backgroundColor: '#4b5563', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Edit</button>
                                <button onClick={() => handleDeleteCandidate(item.id)} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Del</button>
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

        {/* Mark as Paid Popup Modal */}
        {paymentModalCandidate && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '10px' }}>
            <div className="animated-modal" style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '100%', maxWidth: '380px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginTop: 0, color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', fontSize: '16px' }}>Mark Invoice as Paid</h3>
              <form onSubmit={handleMarkAsPaidSubmit}>
                <p style={{ fontSize: '13px', color: '#4b5563' }}>Candidate: <strong>{paymentModalCandidate.name}</strong> ({paymentModalCandidate.company_name})</p>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Payment Date *</label>
                  <input type="date" value={paymentDateInput} onChange={(e) => setPaymentDateInput(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Payment Mode *</label>
                  <select value={paymentModeInput} onChange={(e) => setPaymentModeInput(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                    <option value="NEFT">NEFT</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ flex: 1, padding: '9px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                    Confirm Payment
                  </button>
                  <button type="button" onClick={() => setPaymentModalCandidate(null)} style={{ padding: '9px', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Candidate Detail View Modal */}
        {selectedCandidate && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '10px' }}>
            <div className="animated-modal" style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '100%', maxWidth: '380px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginTop: 0, color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', fontSize: '16px' }}>Candidate Details</h3>
              <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#374151' }}>
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
              <button onClick={() => setSelectedCandidate(null)} style={{ marginTop: '15px', width: '100%', padding: '10px', backgroundColor: '#4b5563', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
