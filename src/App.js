import React, { useState, useEffect } from 'react';
import { Activity, Droplet, Users, Package, AlertCircle, TrendingUp, LogOut, UserPlus } from 'lucide-react';

export default function BloodVaultApp() {
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [recipients, setRecipients] = useState([]);
  const [donors, setDonors] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mlInsights, setMlInsights] = useState(null);
  const [demandForecast, setDemandForecast] = useState(null);
  const [donorMatches, setDonorMatches] = useState([]);
  const [newRecipient, setNewRecipient] = useState({
    fullName: '',
    bloodType: 'A+',
    phone: '',
    hospital: '',
    urgencyLevel: 5,
    hemoglobinLevel: '',
    systolicBP: '',
    diastolicBP: '',
    heartRate: '',
    age: '',
    requiredUnits: 1
  });
  const [newDonor, setNewDonor] = useState({
    fullName: '',
    bloodType: 'A+',
    phone: '',
    address: '',
    dateOfBirth: '',
    medicalHistory: ''
  });
  const [newBloodUnit, setNewBloodUnit] = useState({
    bloodType: 'A+',
    component: 'Whole Blood',
    donorId: '',
    volume: 450,
    bagNumber: ''
  });
  const [newOrder, setNewOrder] = useState({
    recipientId: '',
    bloodType: 'A+',
    component: 'Whole Blood',
    unitsRequested: 1,
    urgency: 'medium'
  });
  const [orderFilter, setOrderFilter] = useState('all'); // 'all', 'pending', 'fulfilled'

  const API_URL = 'http://localhost:5000/api';

  const fetchData = async (endpoint) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
      return [];
    }
  };

  useEffect(() => {
    if (token) {
      fetchData('recipients').then(setRecipients);
      fetchData('donors').then(setDonors);
      fetchData('inventory').then(setInventory);
      fetchData('orders').then(setOrders);
      fetchData('ml/insights').then(setMlInsights);
      fetchData('ml/forecast').then(setDemandForecast);
    }
  }, [token]);

  const findDonorMatches = async (recipientId) => {
    try {
      const res = await fetch(`${API_URL}/ml/match-donors/${recipientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDonorMatches(data);
    } catch (err) {
      console.error('Error finding donor matches:', err);
    }
  };

  const handleAuth = async () => {
    setError('');
    setLoading(true);

    if (authMode === 'register') {
      if (authForm.password !== authForm.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (authForm.password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
    }

    try {
      const endpoint = authMode === 'login' ? 'auth/login' : 'auth/register';
      const body = authMode === 'login' 
        ? { email: authForm.email, password: authForm.password }
        : { email: authForm.email, password: authForm.password, roleName: 'user' };

      const res = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        if (authMode === 'register') {
          setError('');
          alert('✅ Registration successful! Please login.');
          setAuthMode('login');
          setAuthForm({ email: authForm.email, password: '', confirmPassword: '' });
        } else {
          if (data.token) {
            setToken(data.token);
            setError('');
          } else {
            setError('Login failed. Please check your credentials.');
          }
        }
      } else {
        setError(data.error || `${authMode === 'login' ? 'Login' : 'Registration'} failed`);
      }
    } catch (err) {
      setError(`Error: ${err.message}. Make sure backend is running on port 5000.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipient = async () => {
    if (!newRecipient.fullName || !newRecipient.age || !newRecipient.hemoglobinLevel) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/recipients`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newRecipient,
          hemoglobinLevel: parseFloat(newRecipient.hemoglobinLevel),
          systolicBP: parseInt(newRecipient.systolicBP),
          diastolicBP: parseInt(newRecipient.diastolicBP),
          heartRate: parseInt(newRecipient.heartRate),
          age: parseInt(newRecipient.age)
        })
      });
      const data = await res.json();
      setRecipients([...recipients, data]);
      setNewRecipient({
        fullName: '', bloodType: 'A+', phone: '', hospital: '',
        urgencyLevel: 5, hemoglobinLevel: '', systolicBP: '',
        diastolicBP: '', heartRate: '', age: '', requiredUnits: 1
      });
      alert(`✅ Recipient added with ML priority score: ${data.predictedPriority}%`);
    } catch (err) {
      alert('Error adding recipient: ' + err.message);
    }
  };

  const handleAddDonor = async () => {
    if (!newDonor.fullName || !newDonor.phone) {
      alert('Please fill in required fields (Name and Phone)');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/donors`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newDonor)
      });
      const data = await res.json();
      setDonors([...donors, data]);
      setNewDonor({
        fullName: '', bloodType: 'A+', phone: '',
        address: '', dateOfBirth: '', medicalHistory: ''
      });
      alert('✅ Donor added successfully!');
    } catch (err) {
      alert('Error adding donor: ' + err.message);
    }
  };

  const handleAddBloodUnit = async () => {
    if (!newBloodUnit.bagNumber) {
      alert('Please provide a bag number');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/blood`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newBloodUnit,
          donorId: newBloodUnit.donorId || null,
          volume: parseInt(newBloodUnit.volume)
        })
      });
      const data = await res.json();
      
      // Refresh inventory
      const updatedInventory = await fetchData('inventory');
      setInventory(updatedInventory);
      
      setNewBloodUnit({
        bloodType: 'A+',
        component: 'Whole Blood',
        donorId: '',
        volume: 450,
        bagNumber: ''
      });
      alert('✅ Blood unit added to inventory!');
    } catch (err) {
      alert('Error adding blood unit: ' + err.message);
    }
  };

  const handleCreateOrder = async () => {
    if (!newOrder.recipientId) {
      alert('Please select a recipient');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newOrder,
          unitsRequested: parseInt(newOrder.unitsRequested)
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        setOrders([...orders, data]);
        
        // Refresh inventory
        const updatedInventory = await fetchData('inventory');
        setInventory(updatedInventory);
        
        setNewOrder({
          recipientId: '',
          bloodType: 'A+',
          component: 'Whole Blood',
          unitsRequested: 1,
          urgency: 'medium'
        });
        alert('✅ Order created and units reserved!');
      } else {
        alert('❌ ' + data.error);
      }
    } catch (err) {
      alert('Error creating order: ' + err.message);
    }
  };

  const handleFulfillOrder = async (orderId) => {
    if (!confirm('Are you sure you want to fulfill this order? This will release the blood to the recipient.')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/fulfill`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Update the specific order in the orders array
        setOrders(prevOrders => 
          prevOrders.map(o => o._id === orderId ? data : o)
        );
        
        // Refresh inventory to show updated stock
        const updatedInventory = await fetchData('inventory');
        setInventory(updatedInventory);
        
        alert('✅ Order fulfilled successfully!');
      } else {
        const errorData = await res.json();
        alert('❌ ' + (errorData.error || 'Failed to fulfill order'));
      }
    } catch (err) {
      alert('Error fulfilling order: ' + err.message);
    }
  };

  const handleAutoFulfillPriority = async () => {
    if (!confirm('Auto-fulfill will process pending orders based on recipient priority. Continue?')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/orders/auto-fulfill`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        
        alert(`✅ Auto-fulfill complete!\n\nFulfilled: ${data.fulfilled} orders\nSkipped: ${data.skipped} orders (insufficient inventory)`);
        
        // Refresh all orders and inventory
        const updatedOrders = await fetchData('orders');
        setOrders(updatedOrders);
        const updatedInventory = await fetchData('inventory');
        setInventory(updatedInventory);
      } else {
        const errorData = await res.json();
        alert('❌ ' + (errorData.error || 'Auto-fulfill failed'));
      }
    } catch (err) {
      alert('Error in auto-fulfill: ' + err.message);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Droplet className="w-12 h-12 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-800 ml-3">Blood Vault</h1>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setAuthMode('login'); setError(''); }}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                authMode === 'login' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setAuthMode('register'); setError(''); }}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                authMode === 'register' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={authForm.confirmPassword}
                  onChange={(e) => setAuthForm({...authForm, confirmPassword: e.target.value})}
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            )}
            <button 
              onClick={handleAuth}
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>Loading...</>
              ) : authMode === 'login' ? (
                <>Sign In</>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create Account
                </>
              )}
            </button>
          </div>

          {authMode === 'register' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> Registration creates a new user account. After registration, use the same email and password to login.
              </p>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 font-semibold mb-2">⚠️ Backend Required:</p>
            <p className="text-xs text-gray-500">Make sure the backend server is running on <code className="bg-gray-200 px-1 rounded">localhost:5000</code></p>
            <p className="text-xs text-gray-500 mt-1">Run: <code className="bg-gray-200 px-1 rounded">node server.js</code> in the backend folder</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Droplet className="w-8 h-8 text-red-600" />
              <span className="ml-2 text-xl font-bold text-gray-800">Blood Vault</span>
            </div>
            <button 
              onClick={() => { setToken(null); setAuthForm({ email: '', password: '', confirmPassword: '' }); }}
              className="flex items-center text-gray-600 hover:text-red-600 transition"
            >
              <LogOut className="w-5 h-5 mr-1" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          {['dashboard', 'recipients', 'donors', 'inventory', 'orders', 'ml-insights'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                activeTab === tab 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'ml-insights' ? 'ML Insights' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Users />} title="Total Donors" value={donors.length} color="blue" />
              <StatCard icon={<Activity />} title="Recipients" value={recipients.length} color="red" />
              <StatCard icon={<Package />} title="Blood Units" value={inventory.reduce((sum, inv) => sum + inv.availableUnits, 0)} color="green" />
              <StatCard icon={<AlertCircle />} title="Pending Orders" value={orders.filter(o => o.status === 'pending').length} color="yellow" />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="w-6 h-6 mr-2 text-red-600" />
                High Priority Recipients (ML Predicted)
              </h2>
              {recipients.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recipients yet. Add recipients in the Recipients tab.</p>
              ) : (
                <div className="space-y-3">
                  {recipients
                    .sort((a, b) => b.predictedPriority - a.predictedPriority)
                    .slice(0, 5)
                    .map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-800">{r.fullName}</p>
                          <p className="text-sm text-gray-600">{r.bloodType} • {r.hospital || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            r.predictedPriority >= 80 ? 'text-red-600' :
                            r.predictedPriority >= 60 ? 'text-orange-600' : 'text-yellow-600'
                          }`}>
                            {r.predictedPriority}%
                          </div>
                          <p className="text-xs text-gray-500">Priority Score</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Inventory Status</h2>
              {inventory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No inventory data available.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {inventory.map((inv, idx) => (
                    <div key={idx} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-lg">{inv.bloodType}</span>
                        <Droplet className="w-5 h-5 text-red-500" />
                      </div>
                      <p className="text-sm text-gray-600">{inv.component}</p>
                      <p className="text-2xl font-bold text-gray-800 mt-2">{inv.availableUnits}</p>
                      <p className="text-xs text-gray-500">units available</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'recipients' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Recipient</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={newRecipient.fullName}
                  onChange={(e) => setNewRecipient({...newRecipient, fullName: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                />
                <select
                  value={newRecipient.bloodType}
                  onChange={(e) => setNewRecipient({...newRecipient, bloodType: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="Phone"
                  value={newRecipient.phone}
                  onChange={(e) => setNewRecipient({...newRecipient, phone: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Hospital"
                  value={newRecipient.hospital}
                  onChange={(e) => setNewRecipient({...newRecipient, hospital: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Age *"
                  value={newRecipient.age}
                  onChange={(e) => setNewRecipient({...newRecipient, age: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Hemoglobin (g/dL) *"
                  value={newRecipient.hemoglobinLevel}
                  onChange={(e) => setNewRecipient({...newRecipient, hemoglobinLevel: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Systolic BP *"
                  value={newRecipient.systolicBP}
                  onChange={(e) => setNewRecipient({...newRecipient, systolicBP: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Diastolic BP *"
                  value={newRecipient.diastolicBP}
                  onChange={(e) => setNewRecipient({...newRecipient, diastolicBP: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Heart Rate *"
                  value={newRecipient.heartRate}
                  onChange={(e) => setNewRecipient({...newRecipient, heartRate: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                />
                <button onClick={handleAddRecipient} type="button" className="md:col-span-3 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">
                  Add Recipient (ML Priority Auto-Calculated)
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">All Recipients</h2>
              {recipients.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recipients added yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Name</th>
                        <th className="text-left py-3 px-4">Blood Type</th>
                        <th className="text-left py-3 px-4">Hospital</th>
                        <th className="text-left py-3 px-4">ML Priority</th>
                        <th className="text-left py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipients.sort((a, b) => b.predictedPriority - a.predictedPriority).map((r, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{r.fullName}</td>
                          <td className="py-3 px-4">{r.bloodType}</td>
                          <td className="py-3 px-4">{r.hospital || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              r.predictedPriority >= 80 ? 'bg-red-100 text-red-800' :
                              r.predictedPriority >= 60 ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {r.predictedPriority}%
                            </span>
                          </td>
                          <td className="py-3 px-4">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'donors' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Register New Donor</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={newDonor.fullName}
                  onChange={(e) => setNewDonor({...newDonor, fullName: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                />
                <select
                  value={newDonor.bloodType}
                  onChange={(e) => setNewDonor({...newDonor, bloodType: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="Phone *"
                  value={newDonor.phone}
                  onChange={(e) => setNewDonor({...newDonor, phone: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                />
                <input
                  type="date"
                  placeholder="Date of Birth"
                  value={newDonor.dateOfBirth}
                  onChange={(e) => setNewDonor({...newDonor, dateOfBirth: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={newDonor.address}
                  onChange={(e) => setNewDonor({...newDonor, address: e.target.value})}
                  className="px-4 py-2 border rounded-lg md:col-span-2"
                />
                <textarea
                  placeholder="Medical History"
                  value={newDonor.medicalHistory}
                  onChange={(e) => setNewDonor({...newDonor, medicalHistory: e.target.value})}
                  className="px-4 py-2 border rounded-lg md:col-span-2"
                  rows="3"
                />
                <button onClick={handleAddDonor} type="button" className="md:col-span-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Register Donor
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Registered Donors</h2>
              {donors.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No donors registered yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {donors.map((d, idx) => (
                    <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">{d.fullName}</h3>
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                          {d.bloodType}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Phone: {d.phone}</p>
                      <p className="text-sm text-gray-600">Total Donations: {d.totalDonations}</p>
                      <p className={`text-sm font-medium mt-2 ${d.isEligible ? 'text-green-600' : 'text-red-600'}`}>
                        {d.isEligible ? 'Eligible to Donate' : 'Not Eligible'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Add Blood Unit to Inventory</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <select
                  value={newBloodUnit.bloodType}
                  onChange={(e) => setNewBloodUnit({...newBloodUnit, bloodType: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
                <select
                  value={newBloodUnit.component}
                  onChange={(e) => setNewBloodUnit({...newBloodUnit, component: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="Whole Blood">Whole Blood</option>
                  <option value="Plasma">Plasma</option>
                  <option value="Platelets">Platelets</option>
                  <option value="RBC">Red Blood Cells</option>
                </select>
                <select
                  value={newBloodUnit.donorId}
                  onChange={(e) => setNewBloodUnit({...newBloodUnit, donorId: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="">Select Donor (Optional)</option>
                  {donors.map(d => (
                    <option key={d._id} value={d._id}>{d.fullName} - {d.bloodType}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Bag Number *"
                  value={newBloodUnit.bagNumber}
                  onChange={(e) => setNewBloodUnit({...newBloodUnit, bagNumber: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Volume (mL)"
                  value={newBloodUnit.volume}
                  onChange={(e) => setNewBloodUnit({...newBloodUnit, volume: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                />
                <button 
                  onClick={handleAddBloodUnit} 
                  type="button" 
                  className="bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  Add to Inventory
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Blood Inventory</h2>
              {inventory.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No inventory data available.</p>
                  <p className="text-sm text-gray-400 mt-2">Add blood units above to see inventory.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Blood Type</th>
                        <th className="text-left py-3 px-4">Component</th>
                        <th className="text-left py-3 px-4">Available</th>
                        <th className="text-left py-3 px-4">Reserved</th>
                        <th className="text-left py-3 px-4">Total</th>
                        <th className="text-left py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((inv, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-bold">{inv.bloodType}</td>
                          <td className="py-3 px-4">{inv.component}</td>
                          <td className="py-3 px-4">{inv.availableUnits}</td>
                          <td className="py-3 px-4">{inv.reservedUnits}</td>
                          <td className="py-3 px-4">{inv.totalUnits}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              inv.availableUnits < inv.minThreshold 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {inv.availableUnits < inv.minThreshold ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ml-insights' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🤖 ML-Powered Analytics Dashboard</h2>
              
              {mlInsights && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-semibold">Risk Assessment</p>
                    <p className="text-2xl font-bold text-blue-800 mt-1">
                      {mlInsights.criticalRecipients || 0}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">Critical cases detected</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-semibold">Optimization Score</p>
                    <p className="text-2xl font-bold text-green-800 mt-1">
                      {mlInsights.optimizationScore || 0}%
                    </p>
                    <p className="text-xs text-green-600 mt-1">System efficiency</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600 font-semibold">Stock Alerts</p>
                    <p className="text-2xl font-bold text-orange-800 mt-1">
                      {mlInsights.stockAlerts || 0}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">Low inventory warnings</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Demand Forecasting (Next 7 Days)</h2>
              {demandForecast ? (
                <div className="space-y-3">
                  {Object.entries(demandForecast.predictions || {}).map(([bloodType, demand]) => (
                    <div key={bloodType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg w-12">{bloodType}</span>
                        <div className="flex-1">
                          <div className="h-3 bg-gray-200 rounded-full w-48">
                            <div 
                              className="h-3 bg-red-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (demand / 20) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">{demand} units</p>
                        <p className="text-xs text-gray-500">predicted demand</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>ML Insight:</strong> {demandForecast.insight || 'Forecast based on historical patterns and seasonal trends'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Loading forecast data...</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🎯 Smart Donor Matching</h2>
              <p className="text-sm text-gray-600 mb-4">Select a recipient to find optimal donor matches using ML</p>
              
              <select 
                onChange={(e) => e.target.value && findDonorMatches(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg mb-4"
              >
                <option value="">Select a recipient...</option>
                {recipients.map(r => (
                  <option key={r._id} value={r._id}>
                    {r.fullName} - {r.bloodType} (Priority: {r.predictedPriority}%)
                  </option>
                ))}
              </select>

              {donorMatches.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-700">Top Matched Donors:</h3>
                  {donorMatches.map((match, idx) => (
                    <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-800">{match.donor.fullName}</p>
                          <p className="text-sm text-gray-600">
                            {match.donor.bloodType} • {match.donor.phone}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Donations: {match.donor.totalDonations} • Eligible: {match.donor.isEligible ? '✅' : '❌'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">{match.matchScore}%</div>
                          <p className="text-xs text-gray-500">Match Score</p>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        <strong>Factors:</strong> {match.reasons.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">⚡ Real-time Recommendations</h2>
              {mlInsights?.recommendations ? (
                <div className="space-y-3">
                  {mlInsights.recommendations.map((rec, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                      rec.priority === 'high' ? 'bg-red-50 border-red-500' :
                      rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                    }`}>
                      <p className="font-semibold text-gray-800">{rec.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                      <p className="text-xs text-gray-500 mt-2">Action: {rec.action}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No recommendations at this time</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Order</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <select
                  value={newOrder.recipientId}
                  onChange={(e) => {
                    const recipient = recipients.find(r => r._id === e.target.value);
                    setNewOrder({
                      ...newOrder, 
                      recipientId: e.target.value,
                      bloodType: recipient ? recipient.bloodType : newOrder.bloodType
                    });
                  }}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="">Select Recipient *</option>
                  {recipients
                    .sort((a, b) => b.predictedPriority - a.predictedPriority)
                    .map(r => (
                      <option key={r._id} value={r._id}>
                        {r.fullName} - {r.bloodType} (Priority: {r.predictedPriority}%)
                      </option>
                    ))}
                </select>
                <select
                  value={newOrder.bloodType}
                  onChange={(e) => setNewOrder({...newOrder, bloodType: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
                <select
                  value={newOrder.component}
                  onChange={(e) => setNewOrder({...newOrder, component: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="Whole Blood">Whole Blood</option>
                  <option value="Plasma">Plasma</option>
                  <option value="Platelets">Platelets</option>
                  <option value="RBC">Red Blood Cells</option>
                </select>
                <input
                  type="number"
                  placeholder="Units Requested"
                  value={newOrder.unitsRequested}
                  onChange={(e) => setNewOrder({...newOrder, unitsRequested: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                  min="1"
                />
                <select
                  value={newOrder.urgency}
                  onChange={(e) => setNewOrder({...newOrder, urgency: e.target.value})}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="low">Low Urgency</option>
                  <option value="medium">Medium Urgency</option>
                  <option value="high">High Urgency</option>
                  <option value="critical">Critical</option>
                </select>
                <button 
                  onClick={handleCreateOrder} 
                  type="button" 
                  className="bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <AlertCircle className="w-5 h-5" />
                  Create Order
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-sm p-6 border-2 border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    🤖 AI-Powered Auto-Fulfill
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically fulfill orders based on ML priority scores
                  </p>
                </div>
                <button 
                  onClick={handleAutoFulfillPriority}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold shadow-md hover:shadow-lg transition flex items-center gap-2"
                >
                  <TrendingUp className="w-5 h-5" />
                  Auto-Fulfill Priority Orders
                </button>
              </div>
              <div className="mt-3 p-3 bg-white rounded-lg border border-purple-100">
                <p className="text-xs text-gray-600">
                  <strong>How it works:</strong> The system will process all pending orders sorted by recipient priority score (highest first), 
                  checking inventory availability and fulfilling orders automatically until stock is exhausted.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Blood Orders</h2>
                <div className="flex gap-3 items-center">
                  <select
                    value={orderFilter}
                    onChange={(e) => setOrderFilter(e.target.value)}
                    className="px-3 py-1 border rounded-lg text-sm"
                  >
                    <option value="all">All Orders</option>
                    <option value="pending">Pending Only</option>
                    <option value="fulfilled">Fulfilled Only</option>
                  </select>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                    {orders.filter(o => o.status === 'pending').length} Pending
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    {orders.filter(o => o.status === 'fulfilled').length} Fulfilled
                  </span>
                </div>
              </div>
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No orders yet.</p>
                  <p className="text-sm text-gray-400 mt-2">Create an order above to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders
                    .filter(o => {
                      if (orderFilter === 'pending') return o.status === 'pending';
                      if (orderFilter === 'fulfilled') return o.status === 'fulfilled';
                      return true;
                    })
                    .sort((a, b) => {
                      // Sort by status (pending first) then by priority
                      if (a.status !== b.status) {
                        return a.status === 'pending' ? -1 : 1;
                      }
                      return (b.recipientId?.predictedPriority || 0) - (a.recipientId?.predictedPriority || 0);
                    })
                    .map((order, idx) => (
                      <div key={order._id || idx} className={`p-4 border-2 rounded-lg hover:shadow-md transition ${
                        order.status === 'pending' ? 'border-yellow-200 bg-yellow-50' : 
                        order.status === 'fulfilled' ? 'border-green-200 bg-green-50' :
                        'border-gray-200 bg-white'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <p className="font-semibold text-lg">{order.recipientId?.fullName || 'Unknown'}</p>
                              {order.recipientId?.predictedPriority && (
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  order.recipientId.predictedPriority >= 80 ? 'bg-red-500 text-white' :
                                  order.recipientId.predictedPriority >= 60 ? 'bg-orange-500 text-white' :
                                  'bg-yellow-500 text-white'
                                }`}>
                                  Priority: {order.recipientId.predictedPriority}%
                                </span>
                              )}
                              {order.status === 'fulfilled' && (
                                <span className="px-2 py-1 bg-green-500 text-white rounded text-xs font-bold">
                                  ✓ FULFILLED
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {order.bloodType} • {order.component} • {order.unitsRequested} units
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Created: {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                            </p>
                            {order.fulfilledAt && (
                              <p className="text-xs text-green-700 mt-1 font-semibold flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                Fulfilled: {new Date(order.fulfilledAt).toLocaleDateString()} at {new Date(order.fulfilledAt).toLocaleTimeString()}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                order.urgency === 'critical' ? 'bg-red-100 text-red-800' :
                                order.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                                order.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {order.urgency} urgency
                              </span>
                            </div>
                          </div>
                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleFulfillOrder(order._id)}
                              className="ml-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold text-sm flex items-center gap-2 transition shadow hover:shadow-md"
                            >
                              <Package className="w-4 h-4" />
                              Fulfill Order
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-gray-600 text-sm">{title}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  );
}