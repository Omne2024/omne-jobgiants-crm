import React, { useState } from 'react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Candidates List State
  const [candidates, setCandidates] = useState([
    { id: 1, name: 'Rohan Sharma', recruiter: 'Amit Kumar', joiningDate: '2026-06-15', revenue: 25000, status: 'Joined', invoiceStatus: 'Ready to Invoice' },
    { id: 2, name: 'Priya Verma', recruiter: 'Neha Singh', joiningDate: '2026-08-01', revenue: 30000, status: 'Joined', invoiceStatus: 'Pending' },
  ]);

  // Form States
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    recruiter: '',
    joiningDate: '',
    revenue: '',
    status: 'Joined',
    invoiceStatus: 'Pending'
  });

  const handleLogin = (e) => {
    e.preventDefault();
    if (email && password) {
      setIsAuthenticated(true);
    }
  };

  // Calculate 90 Days Auto Status
  const check90Days = (joiningDateStr) => {
    if (!joiningDateStr) return 'Pending';
    const joiningDate = new Date(joiningDateStr);
    const today = new Date();
    const diffTime = Math.abs(today - joiningDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 90 ? 'Ready to Invoice' : 'Pending';
  };

  // Add or Edit Candidate Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    const autoInvoiceStatus = check90Days(formData.joiningDate);

    if (isEditing) {
      setCandidates(candidates.map(c => c.id === currentId ? { 
        ...formData, 
        id: currentId, 
        revenue: Number(formData.revenue),
        invoiceStatus: autoInvoiceStatus 
      } : c));
      setIsEditing(false);
      setCurrentId(null);
    } else {
      const newCandidate = {
        ...formData,
        id: Date.now(),
        revenue: Number(formData.revenue),
        invoiceStatus: autoInvoiceStatus
      };
      setCandidates([...candidates, newCandidate]);
    }

    setFormData({ name: '', recruiter: '', joiningDate: '', revenue: '', status: 'Joined', invoiceStatus: 'Pending' });
  };

  // Edit Button Click
  const handleEdit = (candidate) => {
    setIsEditing(true);
    setCurrentId(candidate.id);
    setFormData({
      name: candidate.name,
      recruiter: candidate.recruiter,
      joiningDate: candidate.joiningDate,
      revenue: candidate.revenue,
      status: candidate.status,
      invoiceStatus: candidate.invoiceStatus
    });
  };

  // Delete Candidate
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      setCandidates(candidates.filter(c => c.id !== id));
    }
  };

  // KPI Calculations
  const readyToInvoiceList = candidates.filter(c => check90Days(c.joiningDate) === 'Ready to Invoice');
  const totalRevenue = candidates.reduce((acc, curr) => acc + Number(curr.revenue || 0), 0);

  // Leaderboard Calculation
  const leaderboard = Object.values(
    candidates.reduce((acc, curr) => {
      if (!acc[curr.recruiter]) {
        acc[curr.recruiter] = { name: curr.recruiter, placements: 0, revenue: 0 };
      }
      acc[curr.recruiter].placements += 1;
      acc[curr.recruiter].revenue += Number(curr.revenue || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.revenue - a.revenue);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl">
          <h1 className="text-2xl font-bold text-blue-400 text-center mb-2">Omne JobGiants</h1>
          <p className="text-slate-400 text-center text-sm mb-6">Recruitment Consultancy CRM Portal</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Partner Email</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@jobgiants.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Password</label>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-3 rounded-lg text-sm transition">
              Login to CRM
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">Omne JobGiants Recruitment Consultancy</h1>
          <p className="text-xs text-slate-400 mt-1">Logged in as: {email}</p>
        </div>
        <button onClick={() => setIsAuthenticated(false)} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs font-semibold">
          Logout
        </button>
      </header>

      {/* 90-Day Alert Banner */}
      {readyToInvoiceList.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔔</span>
            <div>
              <h4 className="font-semibold text-amber-400">90-Day Completion Alert!</h4>
              <p className="text-xs text-slate-300">{readyToInvoiceList.length} candidate(s) completed 90 days. Ready for Invoicing!</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-xs text-slate-400 font-medium">Total Revenue Generated</p>
          <h3 className="text-2xl font-bold text-emerald-400 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</h3>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-xs text-slate-400 font-medium">Total Placements</p>
          <h3 className="text-2xl font-bold text-blue-400 mt-1">{candidates.length}</h3>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-xs text-slate-400 font-medium">Ready To Invoice (90 Days)</p>
          <h3 className="text-2xl font-bold text-amber-400 mt-1">{readyToInvoiceList.length}</h3>
        </div>
      </div>

      {/* Entry Form: Add / Edit Candidate */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-8">
        <h3 className="text-lg font-bold mb-4 text-blue-400">
          {isEditing ? '✏️ Edit Candidate Details' : '➕ Add New Selected Candidate'}
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Candidate Name</label>
            <input 
              type="text" 
              required 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Full Name" 
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Recruiter Name</label>
            <input 
              type="text" 
              required 
              value={formData.recruiter} 
              onChange={(e) => setFormData({...formData, recruiter: e.target.value})}
              placeholder="Employee/Partner Name" 
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Joining Date</label>
            <input 
              type="date" 
              required 
              value={formData.joiningDate} 
              onChange={(e) => setFormData({...formData, joiningDate: e.target.value})}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Revenue Amount (₹)</label>
            <input 
              type="number" 
              required 
              value={formData.revenue} 
              onChange={(e) => setFormData({...formData, revenue: e.target.value})}
              placeholder="e.g. 25000" 
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold p-2.5 rounded-lg text-xs transition">
              {isEditing ? 'Save Changes' : 'Add Candidate'}
            </button>
            {isEditing && (
              <button 
                type="button" 
                onClick={() => {
                  setIsEditing(false);
                  setFormData({ name: '', recruiter: '', joiningDate: '', revenue: '', status: 'Joined', invoiceStatus: 'Pending' });
                }} 
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold p-2.5 rounded-lg text-xs"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Table Area */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-lg font-bold mb-4 text-slate-200">Candidate Lifecycle Tracker</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs uppercase bg-slate-800/50 text-slate-300">
                <tr>
                  <th className="p-3">Candidate</th>
                  <th className="p-3">Recruiter</th>
                  <th className="p-3">Joining Date</th>
                  <th className="p-3">Revenue</th>
                  <th className="p-3">90-Day Invoice Alert</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => {
                  const invStatus = check90Days(c.joiningDate);
                  return (
                    <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="p-3 font-medium text-slate-200">{c.name}</td>
                      <td className="p-3">{c.recruiter}</td>
                      <td className="p-3">{c.joiningDate}</td>
                      <td className="p-3 text-emerald-400">₹{Number(c.revenue).toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${invStatus === 'Ready to Invoice' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400'}`}>
                          {invStatus}
                        </span>
                      </td>
                      <td className="p-3 flex gap-2">
                        <button onClick={() => handleEdit(c)} className="bg-slate-800 hover:bg-slate-700 text-blue-400 p-1.5 rounded text-xs">
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="bg-slate-800 hover:bg-slate-700 text-rose-400 p-1.5 rounded text-xs">
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-lg font-bold mb-4 text-slate-200">Employee Leaderboard</h3>
          <div className="space-y-4">
            {leaderboard.map((emp, index) => (
              <div key={emp.name} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-slate-800">
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-sm ${index === 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-200 text-sm">{emp.name}</p>
                    <p className="text-xs text-slate-400">{emp.placements} Placements</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-400 text-sm">₹{emp.revenue.toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
