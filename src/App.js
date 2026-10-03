import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';

const SUPABASE_URL = 'https://okreuewrtorwkyidoawx.supabase.co/';
const SUPABASE_ANON_KEY = 'sb_publishable_Iznkoy_uNvS3-dqziX6KYQ_tKS6mvb0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [session] = useState({ user: { email: 'suraj.jha@jobgiants.in' } });
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('Partner');

  const [pendingUsers, setPendingUsers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
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

  useEffect(() => {
    fetchCandidates();
    fetchPendingApprovals();
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
        
        // Agar candidate Dropped ya Rejected hai, toh invoice status bhi Dropped hona chahiye
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

  const fetchPendingApprovals = async () => {
    const { data } = await supabase.from('user_approvals').select('*').eq('status', 'pending');
    if (data) setPendingUsers(data);
  };

  const handleApproveUser = async (user, newStatus) => {
    await supabase.from('user_approvals').update({ status: newStatus }).eq('id', user.id);
    fetchPendingApprovals();
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Agar status Dropped ya Rejected hai, toh invoice status automatically 'Dropped' set kar do
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
      alert("Save nahi ho paya: " + response.error.message + "\n(Tip: Check karein ki Supabase database mein 'status', 'company_name', 'process_name' columns bane hain ya nahi)");
    } else {
      setFormData({ 
        name: '', 
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
    doc.text(`Company / Client: ${candidate.company_name || 'N/A'}`, 14, 66);
    doc.text(`Process Name: ${candidate.process_name || 'N/A'}`, 14, 74);
    doc.text(`Recruiter Assigned: ${candidate.recruiter}`, 14, 82);
    doc.text(`Joining Date: ${candidate.joining_date}`, 14, 90);

    doc.setFillColor(240, 240, 240);
    doc.rect(14, 100, 182, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 18, 106);
    doc.text('Amount (INR)', 150, 106);

    doc.setFont('helvetica', 'normal');
    doc.text(`Recruitment Fee for ${candidate.name}`, 18, 118);
    doc.text(`Rs. ${parseFloat(candidate.revenue || 0).toLocaleString('en-IN')}`, 150, 118);

    doc.line(14, 128, 196, 128);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount Due:', 100, 136);
    doc.text(`Rs. ${parseFloat(candidate.revenue || 0).toLocaleString('en-IN')}`, 150, 136);

    doc.save(`Invoice_${candidate.name.replace(/\s+/g, '_')}.pdf`);
  };

  // Revenue calculation sirf active/joined candidates ke liye jo dropped nahi hain
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
      (item.process_name && item.process_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterInvoiceStatus === 'All' || item.invoice_status === filterInvoiceStatus;
    const matchesStage = filterStage === 'All' || item.status === filterStage;

    return matchesSearch && matchesStatus && matchesStage;
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '15px 25px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px' }}>Omne JobGiants Consultancy Services</h1>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            Direct Access Mode | <strong>Role: {userRole}</strong>
          </span>
        </div>
        <div style={{ backgroundColor: '#16a34a', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
          CRM Active
        </div>
      </div>

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
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Company Name *</label>
              <input type="text" placeholder="e.g. Tech Mahindra / Amazon" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Process Name *</label>
              <input type="text" placeholder="e.g. US Voice / Backend" value={formData.process_name} onChange={(e) => setFormData({ ...formData, process_name: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Recruiter Name *</label>
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
                <button type="button" onClick={() => { setIsEditing(false); setCurrentId(null); setFormData({ name: '', recruiter: '', company_name: '', process_name: '', joining_date: '', revenue: '', status: 'Yet to Join', invoice_status: 'Pending' }); }} style={{ padding: '10px', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
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
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
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
                  <th style={{ padding: '10px' }}>Candidate & Company</th>
                  <th style={{ padding: '10px' }}>Process / Recruiter</th>
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
                        <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: '#4b5563' }}>🏢 {item.company_name || 'N/A'}</div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div>{item.process_name || 'N/A'}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>👤 {item.recruiter}</div>
                      </td>
                      <td style={{ padding: '10px' }}>{item.joining_date}</td>
                      <td style={{ padding: '10px' }}>
                        <div>Rs. {rev.toLocaleString('en-IN')}</div>
                        {isLateral && (
                          <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                            Lateral Hiring
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
    </div>
  );
}
