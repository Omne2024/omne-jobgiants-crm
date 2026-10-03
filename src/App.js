import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';

// ⚠️ REPLACE WITH YOUR ACTUAL SUPABASE CREDENTIALS HERE
const SUPABASE_URL = 'https://okreuewrtorwkyidoawx.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_Iznkoy_uNvS3-dqziX6KYQ_tKS6mvb0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authMessage, setAuthMessage] = useState('');

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

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState('All');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchCandidates();
    }
  }, [session]);

  // Fetch Candidates from Supabase
  const fetchCandidates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('joining_date', { ascending: false });

    if (error) {
      console.error('Error fetching data:', error);
    } else {
      // Auto update 90 days invoice status
      const today = new Date();
      const updated = data.map((item) => {
        const joinDate = new Date(item.joining_date);
        const diffTime = Math.abs(today - joinDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let autoInvoiceStatus = item.invoice_status;
        if (diffDays >= 90 && item.invoice_status === 'Pending') {
          autoInvoiceStatus = 'Ready to Invoice';
        }

        return { ...item, invoice_status: autoInvoiceStatus };
      });
      setCandidates(updated);
    }
    setLoading(false);
  };

  // Auth Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthMessage('Sending Magic Link to your email...');
    const { error } = await supabase.auth.signInWithOtp({ email: authEmail });
    if (error) {
      setAuthMessage('Error: ' + error.message);
    } else {
      setAuthMessage('Check your email for the login link!');
    }
  };

  const handleLogout = () => {
    supabase.auth.signOut();
  };

  // CRUD Handlers
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.recruiter || !formData.joining_date || !formData.revenue) {
      alert('Please fill all required fields');
      return;
    }

    if (isEditing) {
      const { error } = await supabase
        .from('candidates')
        .update(formData)
        .eq('id', currentId);

      if (error) alert(error.message);
    } else {
      const { error } = await supabase
        .from('candidates')
        .insert([{ ...formData, user_email: session.user.email }]);

      if (error) alert(error.message);
    }

    setFormData({ name: '', recruiter: '', joining_date: '', revenue: '', status: 'Joined', invoice_status: 'Pending' });
    setIsEditing(false);
    setCurrentId(null);
    fetchCandidates();
  };

  const handleEdit = (candidate) => {
    setIsEditing(true);
    setCurrentId(candidate.id);
    setFormData({
      name: candidate.name,
      recruiter: candidate.recruiter,
      joining_date: candidate.joining_date,
      revenue: candidate.revenue,
      status: candidate.status,
      invoice_status: candidate.invoice_status
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this candidate record?')) {
      const { error } = await supabase.from('candidates').delete().eq('id', id);
      if (error) alert(error.message);
      else fetchCandidates();
    }
  };

  // PDF Invoice Generator
  const generateInvoicePDF = (candidate) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('OMNE JOBGIANTS CONSULTANCY SERVICES', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Recruitment & Talent Acquisition Solutions', 14, 28);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 28);
    
    doc.line(14, 32, 196, 32);

    // Invoice Details
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('PLACEMENT INVOICE', 14, 45);

    doc.setFontSize(11);
    doc.text(`Candidate Name: ${candidate.name}`, 14, 58);
    doc.text(`Recruiter Assigned: ${candidate.recruiter}`, 14, 66);
    doc.text(`Joining Date: ${candidate.joining_date}`, 14, 74);
    doc.text(`Status: 90 Days Completed`, 14, 82);

    // Financial Table
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

    // Footer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120);
    doc.text('Thank you for partnering with Omne JobGiants Consultancy Services.', 14, 160);

    doc.save(`Invoice_${candidate.name.replace(/\s+/g, '_')}.pdf`);
  };

  // Filtered List
  const filteredCandidates = candidates.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.recruiter.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterInvoiceStatus === 'All' || item.invoice_status === filterInvoiceStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <h3>Loading Omne JobGiants CRM...</h3>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!session) {
    return (
      <div style={{ maxWidth: '400px', margin: '80px auto', padding: '30px', border: '1px solid #e0e0e0', borderRadius: '8px', fontFamily: 'sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h2 style={{ color: '#16a34a', marginTop: 0 }}>Omne JobGiants CRM</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>Sign in via Email Magic Link to access candidate data.</p>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Email Address</label>
            <input
              type="email"
              placeholder="your-email@gmail.com"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Send Magic Link
          </button>
        </form>
        {authMessage && <p style={{ marginTop: '15px', fontSize: '13px', color: '#2563eb' }}>{authMessage}</p>}
      </div>
    );
  }

  // MAIN DASHBOARD SCREEN
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '15px 25px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', color: '#111827' }}>Omne JobGiants Consultancy Services</h1>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>LoggedIn as: {session.user.email}</span>
        </div>
        <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Logout
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Form Column */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: 'fit-content' }}>
          <h3 style={{ marginTop: 0, color: '#1f2937' }}>{isEditing ? 'Edit Candidate' : 'Add New Candidate'}</h3>
          <form onSubmit={handleFormSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Candidate Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Recruiter Name *</label>
              <input
                type="text"
                value={formData.recruiter}
                onChange={(e) => setFormData({ ...formData, recruiter: e.target.value })}
                placeholder="e.g. Amit Kumar"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Joining Date *</label>
              <input
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Revenue / Fee (INR) *</label>
              <input
                type="number"
                value={formData.revenue}
                onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                placeholder="e.g. 35000"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Invoice Status</label>
              <select
                value={formData.invoice_status}
                onChange={(e) => setFormData({ ...formData, invoice_status: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              >
                <option value="Pending">Pending (Under 90 Days)</option>
                <option value="Ready to Invoice">Ready to Invoice (90 Days Done)</option>
                <option value="Invoiced">Invoiced / Sent</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {isEditing ? 'Update Candidate' : 'Save Candidate'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({ name: '', recruiter: '', joining_date: '', revenue: '', status: 'Joined', invoice_status: 'Pending' });
                  }}
                  style={{ padding: '10px', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Candidate List Column */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#1f2937' }}>Candidate Placement Records ({filteredCandidates.length})</h3>
            
            {/* Search & Filters */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search Candidate / Recruiter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
              />
              <select
                value={filterInvoiceStatus}
                onChange={(e) => setFilterInvoiceStatus(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
              >
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
                <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Candidate</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Recruiter</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Joining Date</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Revenue</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Invoice Status</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>No candidate records found.</td>
                </tr>
              ) : (
                filteredCandidates.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.name}</td>
                    <td style={{ padding: '10px' }}>{item.recruiter}</td>
                    <td style={{ padding: '10px' }}>{item.joining_date}</td>
                    <td style={{ padding: '10px' }}>Rs. {parseFloat(item.revenue).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor:
                            item.invoice_status === 'Ready to Invoice' ? '#fef3c7' :
                            item.invoice_status === 'Paid' ? '#dcfce7' :
                            item.invoice_status === 'Invoiced' ? '#e0e7ff' : '#f3f4f6',
                          color:
                            item.invoice_status === 'Ready to Invoice' ? '#d97706' :
                            item.invoice_status === 'Paid' ? '#15803d' :
                            item.invoice_status === 'Invoiced' ? '#4338ca' : '#374151'
                        }}
                      >
                        {item.invoice_status}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {item.invoice_status === 'Ready to Invoice' && (
                          <button
                            onClick={() => generateInvoicePDF(item)}
                            style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                          >
                            PDF Invoice
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(item)}
                          style={{ backgroundColor: '#f3f4f6', border: '1px solid #ccc', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                        >
                          Del
                        </button>
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
  );
}
