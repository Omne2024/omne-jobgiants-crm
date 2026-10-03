import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';

const SUPABASE_URL = 'https://okreuewrtorwkyidoawx.supabase.co/';
const SUPABASE_ANON_KEY = 'sb_publishable_Iznkoy_uNvS3-dqziX6KYQ_tKS6mvb0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  // Authentication bypass: Directly setting session & Partner role
  const [session] = useState({ user: { email: 'suraj.jha@jobgiants.in' } });
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('Partner');
  const [approvalStatus] = useState('approved');

  // Admin Pending Approvals
  const [pendingUsers, setPendingUsers] = useState([]);

  // App Data States
  const [candidates, setCandidates] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    recruiter: '',
    joining_date: '',
    revenue: '',
    status: 'Joined',
    invoice_status: 'Pending'
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState('All');

  useEffect(() => {
    fetchCandidates();
    fetchPendingApprovals();
  }, []);

  const fetchCandidates = async () => {
    let query = supabase.from('candidates').select('*');
    const { data } = await query.order('joining_date', { ascending: false });

    if (data) {
      const today = new Date();
      const updated = data.map((item) => {
        const joinDate = new Date(item.joining_date);
        const diffDays = Math.ceil(Math.abs(today - joinDate) / (1000 * 60 * 60 * 24));
        return {
          ...item,
          invoice_status: (diffDays >= 90 && item.invoice_status === 'Pending') ? 'Ready to Invoice' : item.invoice_status
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
    let response;

    if (isEditing) {
      response = await supabase.from('candidates').update(formData).eq('id', currentId);
    } else {
      response = await supabase.from('candidates').insert([formData]);
    }

    if (response && response.error) {
      console.error("Supabase Save Error:", response.error);
      alert("Save nahi ho paya: " + response.error.message);
    } else {
      setFormData({ name: '', recruiter: '', joining_date: '', revenue: '', status: 'Joined', invoice_status: 'Pending' });
      setIsEditing(false);
      fetchCandidates();
    }
  };

  const generateInvoicePDF = (candidate) => {
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
    doc.text(`Recruiter Assigned: ${candidate.recruiter}`, 14, 66);
    doc.text(`Joining Date: ${candidate.joining_date}`, 14, 74);
    doc.text(`Status: 90 Days Completed`, 14, 82);

    doc.setFillColor(240, 240, 240);
    doc.rect(14, 95, 182, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 18, 101);
    doc.text('Amount (INR)', 150, 101);

    doc.setFont('helvetica', 'normal');
    doc.text(`Recruitment Fee for ${candidate.name}`, 18, 113);
    doc.text(`Rs. ${parseFloat(candidate.revenue).toLocaleString('en-IN')}`, 150, 113);

    doc.line(14, 122, 196, 122);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount Due:', 100, 130);
    doc.text(`Rs. ${parseFloat(candidate.revenue).toLocaleString('en-IN')}`, 150, 130);

    doc.save(`Invoice_${candidate.name.replace(/\s+/g, '_')}.pdf`);
  };

  const totalRevenue = candidates.reduce((acc, curr) => acc + (parseFloat(curr.revenue) || 0), 0);

  const filteredCandidates = candidates.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.recruiter.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterInvoiceStatus === 'All' || item.invoice_status === filterInvoiceStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>Loading Omne JobGiants CRM...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '15px 25px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px' }}>Omne JobGiants Consultancy Services</h1>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            Direct Access Mode | <strong>Role: {userRole}</strong>
          </span>
        </div>
        <div style={{ backgroundColor: '#16a34a', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
          Auth Bypassed Successfully
        </div>
      </div>

      {/* Admin Pending Approvals Panel */}
      {userRole === 'Partner' && pendingUsers.length > 0 && (
        <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#b45309', fontSize: '16px' }}>
            ⚠️ Pending User Access Requests ({pendingUsers.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingUsers.map((user) => (
              <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '10px 15px', borderRadius: '6px' }}>
                <div>
                  <strong>{user.email}</strong> requested role: <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{user.requested_role}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleApproveUser(user, 'approved')} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Approve
                  </button>
                  <button onClick={() => handleApproveUser(user, 'rejected')} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partner Stats Card */}
      {userRole === 'Partner' && (
        <div style={{ backgroundColor: '#16a34a', color: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase', opacity: 0.9 }}>Total Agency Revenue Pipeline</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '28px', fontWeight: 'bold' }}>Rs. {totalRevenue.toLocaleString('en-IN')}</p>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '20px' }}>
        {/* Form Column */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: 'fit-content' }}>
          <h3 style={{ marginTop: 0 }}>{isEditing ? 'Edit Candidate' : 'Add Candidate'}</h3>
          <form onSubmit={handleFormSubmit}>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Candidate Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
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
              <input type="number" value={formData.revenue} onChange={(e) => setFormData({ ...formData, revenue: e.target.value })} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Invoice Status</label>
              <select value={formData.invoice_status} onChange={(e) => setFormData({ ...formData, invoice_status: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                <option value="Pending">Pending (Under 90 Days)</option>
                <option value="Ready to Invoice">Ready to Invoice</option>
                <option value="Invoiced">Invoiced</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
              {isEditing ? 'Update Candidate' : 'Save Candidate'}
            </button>
          </form>
        </div>

        {/* List Column */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Candidates ({filteredCandidates.length})</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <select value={filterInvoiceStatus} onChange={(e) => setFilterInvoiceStatus(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="All">All Invoices</option>
                <option value="Pending">Pending</option>
                <option value="Ready to Invoice">Ready to Invoice</option>
                <option value="Invoiced">Invoiced</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Candidate</th>
                <th style={{ padding: '10px' }}>Recruiter</th>
                <th style={{ padding: '10px' }}>Joining Date</th>
                <th style={{ padding: '10px' }}>Revenue</th>
                <th style={{ padding: '10px' }}>Invoice Status</th>
                <th style={{ padding: '10px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.name}</td>
                  <td style={{ padding: '10px' }}>{item.recruiter}</td>
                  <td style={{ padding: '10px' }}>{item.joining_date}</td>
                  <td style={{ padding: '10px' }}>Rs. {parseFloat(item.revenue).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: item.invoice_status === 'Ready to Invoice' ? '#fef3c7' : '#f3f4f6' }}>
                      {item.invoice_status}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {item.invoice_status === 'Ready to Invoice' && (
                        <button onClick={() => generateInvoicePDF(item)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>PDF</button>
                      )}
                      <button onClick={() => { setIsEditing(true); setCurrentId(item.id); setFormData(item); }} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
