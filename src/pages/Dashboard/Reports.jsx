import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Reports = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupReport, setGroupReport] = useState(null);
  const [userReport, setUserReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  // Chart data
  const [expenseData, setExpenseData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Expenses by Category',
        data: [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
        ],
        borderWidth: 1,
      },
    ],
  });

  const [memberExpenses, setMemberExpenses] = useState({
    labels: [],
    datasets: [
      {
        label: 'Expenses by Member',
        data: [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderWidth: 1,
      },
    ],
  });

  // Create a function to get auth headers for all requests
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token'); // Adjust this to match how you store your token
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  useEffect(() => {
    if (user && user.email) {
      fetchGroups();
      // Make sure we have a valid ID to fetch user report
      if (user.id) {
        fetchUserReport(user.id);
      }
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupReport(selectedGroup.id);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:8080/api/groups/my-groups?adminEmail=${user.email}`,
        { headers: getAuthHeaders() }
      );
      
      // Check if response.data is an array. If not, look for data property or use empty array
      const groupsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data && Array.isArray(response.data.data)) 
          ? response.data.data 
          : [];
          
      setGroups(groupsData);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch groups');
      console.error('Error fetching groups:', error);
      setGroups([]);
      setLoading(false);
    }
  };

  const fetchGroupReport = async (groupId) => {
    try {
      setReportLoading(true);
      const response = await axios.get(
        `http://localhost:8080/api/reports/group/${groupId}`,
        { headers: getAuthHeaders() }
      );
      
      // The API returns an array of expenses, not a formatted report
      // We need to transform this data into the format our frontend expects
      const expenses = Array.isArray(response.data) ? response.data : [];
      
      // Process the expenses to create a group report
      const processedReport = processGroupExpenses(expenses);
      setGroupReport(processedReport);
      
      // Process data for charts
      processExpenseDataForCharts(processedReport);
      
      setReportLoading(false);
    } catch (error) {
      toast.error('Failed to fetch group report');
      console.error('Error fetching group report:', error);
      setReportLoading(false);
    }
  };

  // Process the expenses array into a structured report
  const processGroupExpenses = (expenses) => {
    if (!Array.isArray(expenses)) return null;
    
    let totalExpenses = 0;
    const uniqueMembers = new Set();
    const memberBalances = {};
    
    // Process each expense
    expenses.forEach(expense => {
      // Add expense amount to total
      totalExpenses += expense.amount || 0;
      
      // Get payer information (assuming payer details are included in the expense object)
      const payerId = expense.payer?.id;
      const payerName = expense.payer?.name || 'Unknown';
      
      if (payerId) {
        uniqueMembers.add(payerId);
        // Initialize balance for payer if needed
        if (!memberBalances[payerName]) {
          memberBalances[payerName] = 0;
        }
        // Payer paid the full amount
        memberBalances[payerName] += expense.amount || 0;
      }
      
      // Process splits to track who owes what
      if (expense.splits && Array.isArray(expense.splits)) {
        expense.splits.forEach(split => {
          const memberId = split.user?.id;
          const memberName = split.user?.name || 'Unknown';
          
          if (memberId) {
            uniqueMembers.add(memberId);
            // Initialize balance for member if needed
            if (!memberBalances[memberName]) {
              memberBalances[memberName] = 0;
            }
            // Deduct the share that this member owes
            memberBalances[memberName] -= split.share || 0;
          }
        });
      }
    });
    
    return {
      expenses: expenses,
      totalExpenses: totalExpenses,
      memberCount: uniqueMembers.size,
      balances: memberBalances
    };
  };

  const fetchUserReport = async (userId) => {
    try {
      const response = await axios.get(
        `http://localhost:8080/api/reports/user/${userId}`, 
        { headers: getAuthHeaders() }
      );
      
      // The response has the format { totalExpenses, totalPaid, totalOwed, balance }
      const userData = response.data;
      
      // Ensure we have numerical values for the report
      const processedUserReport = {
        totalSpent: parseFloat(userData.totalPaid || 0),
        totalOwed: parseFloat(userData.totalOwed || 0),
        netBalance: parseFloat(userData.balance || 0)
      };
      
      setUserReport(processedUserReport);
    } catch (error) {
      toast.error('Failed to fetch user report');
      console.error('Error fetching user report:', error);
    }
  };

  const processExpenseDataForCharts = (reportData) => {
    if (!reportData || !reportData.expenses || !Array.isArray(reportData.expenses)) return;
    
    // Group expenses by category (using description as category for demo)
    const categories = {};
    reportData.expenses.forEach(expense => {
      const category = expense.description || 'Uncategorized';
      categories[category] = (categories[category] || 0) + (expense.amount || 0);
    });
    
    const categoryLabels = Object.keys(categories);
    const categoryValues = Object.values(categories);
    
    setExpenseData({
      labels: categoryLabels,
      datasets: [
        {
          label: 'Expenses by Category',
          data: categoryValues,
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
          ],
          borderWidth: 1,
        },
      ],
    });
    
    // Group expenses by member balances
    if (reportData.balances) {
      const memberLabels = Object.keys(reportData.balances);
      const memberValues = memberLabels.map(member => Math.abs(reportData.balances[member] || 0));
      
      setMemberExpenses({
        labels: memberLabels,
        datasets: [
          {
            label: 'Member Balances',
            data: memberValues,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderWidth: 1,
          },
        ],
      });
    }
  };

  const handleExportExcel = async () => {
    if (!selectedGroup) return;
  
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:8080/api/reports/group/${selectedGroup.id}/export/excel`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (!response.ok) throw new Error('Failed to download Excel file');
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedGroup.name}_report.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Excel report downloaded!');
    } catch (err) {
      toast.error('Download failed: ' + err.message);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedGroup) return;
  
    const token = localStorage.getItem('token');
  
    try {
      const response = await fetch(`http://localhost:8080/api/reports/group/${selectedGroup.id}/export/pdf`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (!response.ok) {
        throw new Error('Failed to download PDF file');
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
  
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedGroup.name}_report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
  
      toast.success('PDF report downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download PDF report');
    }
  };

  return (
    <div className="container">
      <h2 className="mb-4">Reports</h2>
      
      {/* User Summary */}
      <div className="row mb-4">
        <div className="col-lg-12">
          <div className="card">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">My Summary</h5>
            </div>
            <div className="card-body">
              {!userReport ? (
                <div className="d-flex justify-content-center">
                  <div className="spinner-border text-info" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="row">
                  <div className="col-md-4">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h3 className="mb-0">${userReport.totalSpent?.toFixed(2) || '0.00'}</h3>
                        <p className="text-muted">Total Spent</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h3 className="mb-0">${userReport.totalOwed?.toFixed(2) || '0.00'}</h3>
                        <p className="text-muted">Total Owed</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h3 className={`mb-0 ${userReport.netBalance >= 0 ? 'text-success' : 'text-danger'}`}>
                          ${Math.abs(userReport.netBalance || 0).toFixed(2)}
                        </h3>
                        <p className="text-muted">
                          {(userReport.netBalance || 0) >= 0 ? 'You are owed' : 'You owe'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Group Selection */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Select Group for Report</h5>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="d-flex justify-content-center">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <select 
                  className="form-select" 
                  value={selectedGroup?.id || ''}
                  onChange={(e) => {
                    const groupId = parseInt(e.target.value);
                    const group = groups.find(g => g.id === groupId);
                    setSelectedGroup(group || null);
                  }}
                >
                  <option value="">Select a group</option>
                  {Array.isArray(groups) && groups.map(group => (
                    <option key={group.id || Math.random().toString(36).substr(2, 9)} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
        
        {selectedGroup && (
          <div className="col-md-6">
            <div className="card">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">Export Options</h5>
              </div>
              <div className="card-body d-flex justify-content-around">
                <button 
                  className="btn btn-outline-success"
                  onClick={handleExportExcel}
                >
                  <i className="bi bi-file-earmark-excel me-2"></i>
                  Export to Excel
                </button>
                <button 
                  className="btn btn-outline-danger"
                  onClick={handleExportPdf}
                >
                  <i className="bi bi-file-earmark-pdf me-2"></i>
                  Export to PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Group Report */}
      {selectedGroup && groupReport && (
        <div className="row">
          <div className="col-lg-12">
            <div className="card mb-4">
              <div className="card-header bg-dark text-white">
                <h5 className="mb-0">Report for {selectedGroup.name}</h5>
              </div>
              <div className="card-body">
                {reportLoading ? (
                  <div className="d-flex justify-content-center">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Summary Stats */}
                    <div className="row mb-4">
                      <div className="col-md-4">
                        <div className="card bg-light">
                          <div className="card-body text-center">
                            <h3 className="mb-0">${groupReport.totalExpenses?.toFixed(2) || '0.00'}</h3>
                            <p className="text-muted">Total Expenses</p>
                          </div>
                        </div>
                        </div>
                      <div className="col-md-4">
                        <div className="card bg-light">
                          <div className="card-body text-center">
                            <h3 className="mb-0">{groupReport.expenses?.length || 0}</h3>
                            <p className="text-muted">Total Transactions</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="card bg-light">
                          <div className="card-body text-center">
                            <h3 className="mb-0">{groupReport.memberCount || 0}</h3>
                            <p className="text-muted">Group Members</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Charts */}
                    <div className="row mb-4">
                      <div className="col-md-6">
                        <div className="card">
                          <div className="card-header bg-primary text-white">
                            <h5 className="mb-0">Expenses by Category</h5>
                          </div>
                          <div className="card-body">
                            {expenseData.labels.length > 0 ? (
                              <div style={{ height: '300px' }}>
                                <Pie 
                                  data={expenseData} 
                                  options={{ 
                                    maintainAspectRatio: false,
                                    plugins: {
                                      legend: {
                                        position: 'bottom'
                                      }
                                    }
                                  }} 
                                />
                              </div>
                            ) : (
                              <div className="alert alert-info">No expense data available</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-md-6">
                        <div className="card">
                          <div className="card-header bg-success text-white">
                            <h5 className="mb-0">Member Balances</h5>
                          </div>
                          <div className="card-body">
                            {memberExpenses.labels.length > 0 ? (
                              <div style={{ height: '300px' }}>
                                <Bar 
                                  data={memberExpenses} 
                                  options={{ 
                                    maintainAspectRatio: false,
                                    scales: {
                                      y: {
                                        beginAtZero: true
                                      }
                                    },
                                    plugins: {
                                      legend: {
                                        display: false
                                      }
                                    }
                                  }} 
                                />
                              </div>
                            ) : (
                              <div className="alert alert-info">No member data available</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Balance Details */}
                    <div className="card mb-4">
                      <div className="card-header bg-info text-white">
                        <h5 className="mb-0">Balance Details</h5>
                      </div>
                      <div className="card-body">
                        {groupReport.balances && Object.keys(groupReport.balances).length > 0 ? (
                          <div className="table-responsive">
                            <table className="table table-striped">
                              <thead>
                                <tr>
                                  <th>Member</th>
                                  <th>Balance</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(groupReport.balances).map(([member, balance], index) => (
                                  <tr key={`balance-${index}`}>
                                    <td>{member}</td>
                                    <td>${Math.abs(balance).toFixed(2)}</td>
                                    <td>
                                      {balance > 0 ? (
                                        <span className="badge bg-success">Is owed money</span>
                                      ) : balance < 0 ? (
                                        <span className="badge bg-danger">Owes money</span>
                                      ) : (
                                        <span className="badge bg-secondary">Settled</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="alert alert-info">No balance details available</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Expense List */}
                    <div className="card">
                      <div className="card-header bg-warning text-dark">
                        <h5 className="mb-0">Expense Transactions</h5>
                      </div>
                      <div className="card-body">
                        {groupReport.expenses && groupReport.expenses.length > 0 ? (
                          <div className="table-responsive">
                            <table className="table table-striped table-hover">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Description</th>
                                  <th>Paid By</th>
                                  <th>Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {groupReport.expenses.map((expense, index) => (
                                  <tr key={expense.id || `expense-${index}`}>
                                    <td>{expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A'}</td>
                                    <td>{expense.description || 'No description'}</td>
                                    <td>{expense.payer?.name || 'Unknown'}</td>
                                    <td>${(expense.amount || 0).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="alert alert-info">No expense transactions found</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;