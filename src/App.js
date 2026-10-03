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
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    recruiter: '',
    company_name: '',
    process_name: '',
    joining_date: '',
    revenue: '',
    status: 'Yet to Join',
    invoice_status: 'Pending'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState('All');
  const [filterStage, setFilterStage] = useState('All');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

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
          currentInvoiceStatus = 'Dropped';
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

    let updatedInvoiceStatus = formData.invoice_status;
    if (formData.status === 'Dropped' || formData.status === 'Rejected') {
      updatedInvoiceStatus = 'Dropped';
    }

    const payload = {
      ...formData,
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
        joining_date: '', 
        revenue: '', 
        status: 'Yet to Join', 
        invoice_status: 'Pending' 
      });
      setIsEditing(false);
      setCurrentId(null);
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
      + "name,email,phone,company_name,process_name,recruiter,joining_date,revenue,status\n"
      + "Rahul Sharma,rahul@email.com,9876543210,Tech Mahindra,US Voice,Amit,2026-10-15,35000,Joined\n"
      + "Priya Singh,priya@email.com,9123456789,Amazon,Backend,Neha,2026-10-20,25000,Yet to Join";
    
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

        batchData.push({
          name: obj.name || 'Unknown',
          email: obj.email || '',
          phone: obj.phone || '',
          company_name: obj.company_name || '',
          process_name: obj.process_name || '',
          recruiter: obj.recruiter || 'Unassigned',
          joining_date: obj.joining_date || new Date().toISOString().split('T')[0],
          revenue: obj.revenue || 0,
          status: obj.status || 'Yet to Join',
          invoice_status: (obj.status === 'Dropped' || obj.status === 'Rejected') ? 'Dropped' : 'Pending'
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
    doc.text(`Company / Client: ${candidate.company_name || 'N/A'}`, 14, 74);
    doc.text(`Process Name: ${candidate.process_name || 'N/A'}`, 14, 82);
    doc.text(`Internal HR Assigned: ${candidate.recruiter}`, 14, 90);
    doc.text(`Joining Date: ${candidate.joining_date}`, 14, 98);

    doc.setFillColor(240, 240, 240);
    doc.rect(14, 106, 182, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 18, 112);
    doc.text('Amount (INR)', 150, 112);

    doc.setFont('helvetica', 'normal');
    doc.text(`Recruitment Fee for ${candidate.name}`, 18, 124);
    doc.text(`Rs. ${parseFloat(candidate.revenue || 0).toLocaleString('en-IN')}`, 150, 124);

    doc.line(14, 134, 196, 134);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount Due:', 100, 142);
    doc.text(`Rs. ${parseFloat(candidate.revenue || 0).toLocaleString('en-IN')}`, 150, 142);

    doc.save(`Invoice_${candidate.name.replace(/\s+/g, '_')}.pdf`);
  };

  const totalRevenue = candidates
    .filter(item => item.status !== 'Dropped' && item.status !== 'Rejected')
    .reduce((acc, curr) => acc + (parseFloat(curr.revenue) || 0), 0);
  
  const lateralHiringCount = candidates
    .filter(item => item.status !== 'Dropped' && item.status !== 'Rejected' && parseFloat(item.revenue || 0) >= 30000).length;

  const filteredCandidates = candidates.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||  
      item.recruiter.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.company_name && item.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.process_name && item.process_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.phone && item.phone.includes(searchTerm));
    
    const matchesStatus = filterInvoiceStatus === 'All' || item.invoice_status === filterInvoiceStatus;
    const matchesStage = filterStage === 'All' || item.status === filterStage;

    return matchesSearch && matchesStatus && matchesStage;
  });

  const monthlyData = {};
  candidates.forEach(item => {
    if (!item.joining_date) return;
    const dateObj = new Date(item.joining_date);
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
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '15px 25px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px' }}>Omne JobGiants Consultancy Services</h1>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            Direct Access Mode | <strong>Role: {userRole}</strong>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={downloadSampleCSV} 
            style={{ backgroundColor: '#4b5563', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            📥 Download Sample Excel Template
          </button>

          <label style={{ backgroundColor: '#0284c7', color: '#fff', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            📁 Upload Filled Excel/CSV
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            style={{ padding: '8px 16px', backgroundColor: activeTab === 'dashboard' ? '#16a34a' : '#e5e7eb', color: activeTab === 'dashboard' ? '#fff' : '#374151', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('reports')} 
            style={{ padding: '8px 16px', backgroundColor: activeTab === 'reports' ? '#2563eb' : '#e5e7eb', color: activeTab === 'reports' ? '#fff' : '#374151', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            Monthly Reports
          </button>
        </div>
      </div>

      {activeTab === 'reports' ? (
        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#1f2937' }}>Month-wise Revenue & Internal HR Performance</h2>
          {Object.keys(monthlyData).length === 0 ? (
            <p style={{ color: '#6b7280' }}>Koi data available nahi hai.</p>
          ) : (
            Object.keys(monthlyData).map((month) => {
              const mData = monthlyData[month];
              return (
                <div key={month} style={{ marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', backgroundColor: '#fcfcfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ margin: 0, color: '#2563eb', fontSize: '18px' }}>📅 {month}</h3>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '14px', fontWeight: 'bold' }}>
                      <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: '6px' }}>Revenue: Rs. {mData.totalRevenue.toLocaleString('en-IN')}</span>
                      <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 10px', borderRadius: '6px' }}>Joined: {mData.joinedCount}</span>
                      <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '6px' }}>Dropped/Rejected: {mData.droppedCount}</span>
                    </div>
                  </div>

                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#4b5563' }}>Internal HR Performance for {month}:</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px' }}>Internal HR Name</th>
                          <th style={{ padding: '8px 12px' }}>Joined Candidates</th>
                          <th style={{ padding: '8px 12px' }}>Dropped / Rejected Candidates</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(mData.recruiters).map((rec) => {
                          const recStats = mData.recruiters[rec];
                          return (
                            <tr key={rec} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>👤 {rec}</td>
                              <td style={{ padding: '8px 12px', color: '#065f46', fontWeight: 'bold' }}>{recStats.joined} Joined</td>
                              <td style={{ padding: '8px 12px', color: '#991b1b', fontWeight: 'bold' }}>{recStats.dropped} Dropped</td>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#16a34a', color: '#fff', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase', opacity: 0.9 }}>Active Revenue Pipeline (Excl. Dropped)</h3>
                <p style={{ margin: '5px 0 0 0', fontSize: '28px', fontWeight: 'bold' }}>Rs. {totalRevenue.toLocaleString('en-IN')}</p>
              </div>
              <div style={{ backgroundColor: '#2563eb', color: '#fff', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase', opacity: 0.9 }}>Active Lateral Hirings (≥ Rs. 30k)</h3>
                <p style={{ margin: '5px 0 0 0', fontSize: '28px', fontWeight: 'bold' }}>{lateralHiringCount} Candidates</p>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.8fr', gap: '20px' }}>
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: 'fit-content' }}>
              <h3 style={{ marginTop: 0 }}>{isEditing ? 'Edit Candidate / Status' : 'Add Candidate'}</h3>
              <form onSubmit={handleFormSubmit}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Candidate Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Email Address</label>
                  <input type="email" placeholder="candidate@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Phone Number</label>
                  <input type="text" placeholder="9876543210" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Company Name *</label>
                  <input type="text" placeholder="e.g. Tech Mahindra" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Process Name *</label>
                  <input type="text" placeholder="e.g. US Voice" value={formData.process_name} onChange={(e) => setFormData({ ...formData, process_name: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Internal HR Name *</label>
                  <input type="text" value={formData.recruiter} onChange={(e) => setFormData({ ...formData, recruiter: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Joining Date *</label>
                  <input type="date" value={formData.joining_date} onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Revenue (INR) *</label>
                  <input type="number" placeholder="e.g. 35000" value={formData.revenue} onChange={(e) => setFormData({ ...formData, revenue: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Candidate Status (Stage)</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                    <option value="Yet to Join">Yet to Join</option>
                    <option value="Selected">Selected</option>
                    <option value="Joined">Joined</option>
                    <option value="Dropped">Dropped (Left before 90 days)</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {isEditing ? 'Update Details' : 'Save Candidate'}
                  </button>
                  {isEditing && (
                    <button type="button" onClick={() => { setIsEditing(false); setCurrentId(null); setFormData({ name: '', email: '', phone: '', recruiter: '', company_name: '', process_name: '', joining_date: '', revenue: '', status: 'Yet to Join', invoice_status: 'Pending' }); }} style={{ padding: '10px', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0 }}>Candidates ({filteredCandidates.length})</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Search name, email, phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="All">All Stages</option>
                    <option value="Yet to Join">Yet to Join</option>
                    <option value="Selected">Selected</option>
                    <option value="Joined">Joined</option>
                    <option value="Dropped">Dropped</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <select value={filterInvoiceStatus} onChange={(e) => setFilterInvoiceStatus(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="All">All Invoices</option>
                    <option value="Pending">Pending</option>
                    <option value="Ready to Invoice">Ready to Invoice</option>
                    <option value="Dropped">Dropped / Cancelled</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>Candidate Name (Click for Details)</th>
                      <th style={{ padding: '10px' }}>Process / Internal HR</th>
                      <th style={{ padding: '10px' }}>Joining Date</th>
                      <th style={{ padding: '10px' }}>Revenue & Type</th>
                      <th style={{ padding: '10px' }}>Stage</th>
                      <th style={{ padding: '10px' }}>Invoice</th>
                      <th style={{ padding: '10px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((item) => {
                      const rev = parseFloat(item.revenue || 0);
                      const isLateral = rev >= 30000 && item.status !== 'Dropped' && item.status !== 'Rejected';
                      
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb', opacity: (item.status === 'Dropped' || item.status === 'Rejected') ? 0.6 : 1 }}>
                          <td style={{ padding: '10px' }}>
                            <div 
                              onClick={() => setSelectedCandidate(item)} 
                              style={{ fontWeight: 'bold', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                              title="Click to view candidate details"
                            >
                              {item.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#4b5563' }}>🏢 {item.company_name || 'N/A'}</div>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <div>{item.process_name || 'N/A'}</div>
                            <div style={{ fontSize: '11px', color: '#6b7280' }}>👤 HR: {item.recruiter}</div>
                          </td>
                          <td style={{ padding: '10px' }}>{item.joining_date}</td>
                          <td style={{ padding: '10px' }}>
                            <div>Rs. {rev.toLocaleString('en-IN')}</div>
                            {isLateral && (
                              <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                                Lateral
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ 
                              padding: '4px 8px', 
                              borderRadius: '12px', 
                              fontSize: '11px', 
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
                          <td style={{ padding: '10px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: item.invoice_status === 'Ready to Invoice' ? '#fef3c7' : item.invoice_status === 'Dropped' ? '#fee2e2' : '#f3f4f6' }}>
                              {item.invoice_status}
                            </span>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {item.invoice_status === 'Ready to Invoice' && (
                                <button onClick={() => generateInvoicePDF(item)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>PDF</button>
                              )}
                              <button onClick={() => { setIsEditing(true); setCurrentId(item.id); setFormData(item); }} style={{ backgroundColor: '#4b5563', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Edit</button>
                              <button onClick={() => handleDeleteCandidate(item.id)} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Del</button>
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

      {selectedCandidate && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>Candidate Details</h3>
            <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#374151' }}>
              <p><strong>Name:</strong> {selectedCandidate.name}</p>
              <p><strong>Email:</strong> {selectedCandidate.email || 'N/A'}</p>
              <p><strong>Phone:</strong> {selectedCandidate.phone || 'N/A'}</p>
              <p><strong>Company:</strong> {selectedCandidate.company_name || 'N/A'}</p>
              <p><strong>Process:</strong> {selectedCandidate.process_name || 'N/A'}</p>
              <p><strong>Internal HR:</strong> {selectedCandidate.recruiter || 'N/A'}</p>
              <p><strong>Joining Date:</strong> {selectedCandidate.joining_date || 'N/A'}</p>
              <p><strong>Revenue:</strong> Rs. {parseFloat(selectedCandidate.revenue || 0).toLocaleString('en-IN')}</p>
              <p><strong>Status:</strong> {selectedCandidate.status}</p>
              <p><strong>Invoice Status:</strong> {selectedCandidate.invoice_status}</p>
            </div>
            <button onClick={() => setSelectedCandidate(null)} style={{ marginTop: '15px', width: '100%', padding: '10px', backgroundColor: '#4b5563', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
