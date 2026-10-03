import React, { useState } from 'react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [candidates, setCandidates] = useState([
    { id: 1, name: 'Rohan Sharma', recruiter: 'Amit Kumar', status: '90 Days Completed', joiningDate: '2026-06-15', revenue: 25000, invoiceStatus: 'Ready to Invoice' },
    { id: 2, name: 'Priya Verma', recruiter: 'Neha Singh', status: 'Joined', joiningDate: '2026-08-01', revenue: 30000, invoiceStatus: 'Pending' },
    { id: 3, name: 'Aakash Roy', recruiter: 'Amit Kumar', status: 'Joined', joiningDate: '2026-07-02', revenue: 20000, invoiceStatus: 'Ready to Invoice' },
  ]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (email && password) {
      setIsAuthenticated(true);
    }
  };

  const readyToInvoiceList = candidates.filter(c => c.invoiceStatus === 'Ready to Invoice');
  const totalRevenue = candidates.reduce((acc, curr) => acc + curr.revenue, 0);

  const leaderboard = Object.values(
    candidates.reduce((acc, curr) => {
      if (!acc[curr.recruiter]) {
        acc[curr.recruiter] = { name: curr.recruiter, placements: 0, revenue: 0 };
      }
      acc[curr.recruiter].placements += 1;
      acc[curr.recruiter].revenue += curr.revenue;
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
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"
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
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"
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
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">Omne JobGiants Recruitment Consultancy</h1>
          <p className="text-xs text-slate-400 mt-1">Logged in as: {email}</p>
        </div>
        <button onClick={() => setIsAuthenticated(false)} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs font-semibold">
          Logout
        </button>
      </header>

      {readyToInvoiceList.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔔</span>
            <div>
              <h4 className="font-semibold text-amber-400">90-Day Completion Alert!</h4>
              <p className="text-xs text-slate-300">{readyToInvoiceList.length} candidate(s) have completed 90 days. Ready for invoicing.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-xs text-slate-400 font-medium">Total Revenue</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                  <th className="p-3">90-Day Status</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="p-3 font-medium text-slate-200">{c.name}</td>
                    <td className="p-3">{c.recruiter}</td>
                    <td className="p-3">{c.joiningDate}</td>
                    <td className="p-3 text-emerald-400">₹{c.revenue.toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${c.invoiceStatus === 'Ready to Invoice' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {c.invoiceStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
