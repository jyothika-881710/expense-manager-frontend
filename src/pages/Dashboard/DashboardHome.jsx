import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  PieChart, Pie, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  Cell, ResponsiveContainer, Sector
} from 'recharts';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [summary, setSummary] = useState({
    totalExpenses: 0,
    totalPaid: 0,
    totalOwed: 0,
    balance: 0,
    recentExpenses: [],
    recentSettlements: []
  });
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupExpenses, setGroupExpenses] = useState([]);
  const [groupExpenseLoading, setGroupExpenseLoading] = useState(false);
  const [activeBalanceIndex, setActiveBalanceIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('activity');

  // Enhanced color palette
  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
  const GRADIENT_COLORS = ['#4338CA', '#3B82F6', '#2DD4BF', '#10B981', '#F59E0B', '#EF4444'];

  useEffect(() => {
    if (user && user.id && token) {
      fetchUserSummary();
      fetchGroups();
    }
  }, [user, token]);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupExpenses(selectedGroup);
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (groupExpenses.length > 0) {
      // Update summary with group expenses when they're loaded
      const formattedExpenses = groupExpenses.map(expense => ({
        ...expense,
        groupName: groups.find(g => g.id == selectedGroup)?.name || 'Group',
        paidByUserId: user.id,
        paidByUserName: user.name
      }));

      setSummary(prev => ({
        ...prev,
        recentExpenses: formattedExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
      }));
    }
  }, [groupExpenses, selectedGroup, groups]);

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  const fetchUserSummary = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:8080/api/reports/user/${user.id}`,
        authHeaders
      );

      if (response.data) {
        const processedData = processBackendData(response.data);

        setSummary({
          totalExpenses: response.data.totalExpenses || 0,
          totalPaid: response.data.totalPaid || 0,
          totalOwed: response.data.totalOwed || 0,
          balance: response.data.balance || 0,
          recentExpenses: processedData.recentExpenses,
          recentSettlements: processedData.recentSettlements
        });
      }

      setLoading(false);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error('Error fetching user summary:', error);
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8080/api/groups/my-groups?adminEmail=${user.email}`,
        authHeaders
      );

      const groupsData = Array.isArray(response.data) ? response.data : [];
      setGroups(groupsData);

      // Set the first group as selected by default if available
      if (groupsData.length > 0) {
        setSelectedGroup(groupsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
    }
  };

  const fetchGroupExpenses = async (groupId) => {
    try {
      setGroupExpenseLoading(true);
      const response = await axios.get(
        `http://localhost:8080/api/reports/group/${groupId}`,
        authHeaders
      );

      if (response.data) {
        const formattedExpenses = response.data.map(expense => ({
          ...expense,
          groupName: groups.find(g => g.id == groupId)?.name || 'Group',
          paidByUserId: user.id, // Assume the current user paid for simplicity
          paidByUserName: user.name
        }));

        setGroupExpenses(response.data);

        // Update the summary with these expenses
        setSummary(prev => ({
          ...prev,
          recentExpenses: formattedExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
        }));
      }
      setGroupExpenseLoading(false);
    } catch (error) {
      toast.error('Failed to load group expense data');
      console.error('Error fetching group expenses:', error);
      setGroupExpenseLoading(false);
      setGroupExpenses([]);
    }
  };

  // Process backend data to extract necessary information
  const processBackendData = (data) => {
    let recentExpenses = [];
    let recentSettlements = [];

    if (data && data.groupReports) {
      const allExpenses = [];
      data.groupReports.forEach(group => {
        if (group.expenses) {
          group.expenses.forEach(expense => {
            allExpenses.push({
              ...expense,
              groupName: group.groupName
            });
          });
        }
      });

      recentExpenses = allExpenses
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

      const allSettlements = [];
      data.groupReports.forEach(group => {
        if (group.settlements) {
          group.settlements.forEach(settlement => {
            allSettlements.push({
              ...settlement,
              groupName: group.groupName
            });
          });
        }
      });

      recentSettlements = allSettlements
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    } else {
      // Handle direct expense data format
      if (groupExpenses && groupExpenses.length > 0) {
        recentExpenses = groupExpenses.map(expense => ({
          ...expense,
          groupName: groups.find(g => g.id == selectedGroup)?.name || 'Group',
          paidByUserId: user.id,
          paidByUserName: user.name
        })).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
      }
    }

    return { recentExpenses, recentSettlements };
  };
  // Format date function
  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip bg-white p-3 shadow-sm border rounded">
          <p className="label mb-2 fw-bold">{`${label || payload[0].name}`}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} style={{ color: entry.color }} className="mb-1">
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom active shape for pie chart
  const renderActiveShape = (props) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, value, percent } = props;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 15}
          outerRadius={outerRadius + 20}
          fill={fill}
        />
        <text x={cx} y={cy - 15} textAnchor="middle" fill={fill} fontSize={16} fontWeight="bold">
          {payload.name}
        </text>
        <text x={cx} y={cy + 15} textAnchor="middle" fill="#333" fontSize={14}>
          {formatCurrency(value)} ({(percent * 100).toFixed(1)}%)
        </text>
      </g>
    );
  };

  // Generate expense data by user from group expenses
  const generateGroupExpenseData = () => {
    if (!groupExpenses.length) return [];

    const userExpenseMap = {};

    groupExpenses.forEach(expense => {
      expense.splits.forEach(split => {
        const userName = split.user.name;
        if (!userExpenseMap[userName]) {
          userExpenseMap[userName] = {
            name: userName,
            value: 0,
            balance: split.user.balance,
            userId: split.user.id
          };
        }
        userExpenseMap[userName].value += split.share;
      });
    });

    return Object.values(userExpenseMap).sort((a, b) => b.value - a.value);
  };

  // Generate balance distribution data
  const generateBalanceData = () => {
    if (summary.totalPaid === 0 && summary.totalOwed === 0) return [];

    return [
      { name: 'You Paid', value: Math.abs(summary.totalPaid) || 0 },
      { name: 'You Owe', value: Math.abs(summary.totalOwed) || 0 }
    ].filter(item => item.value > 0);
  };

  return (
    <div className="dashboard">
      {/* Welcome Banner */}
      <div className="welcome-banner bg-light rounded p-4 mb-4 shadow-sm">
        <div className="row align-items-center">
          <div className="col-md-8">
            <h2 className="fw-bold">Welcome back, {user?.name || 'User'}!</h2>
            <p className="text-muted mb-0">Here's what's happening with your expenses</p>
          </div>
          <div className="col-md-4 text-md-end">
            <Link to="/dashboard/expenses" className="btn btn-primary">
              <i className="bi bi-plus-circle me-2"></i>
              Add New Expense
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4 g-3">
        {[
          { title: 'Total Paid', icon: 'bi-credit-card', color: 'primary', value: summary.totalPaid },
          { title: 'Total Owed', icon: 'bi-piggy-bank', color: 'warning', value: summary.totalOwed },
          { title: 'Balance', icon: 'bi-cash-coin', color: summary.balance >= 0 ? 'success' : 'danger', value: summary.balance }
        ].map((card, index) => (
          <div className="col-md-4" key={card.title}>
            <div className={`card border-${card.color} h-100 shadow-sm`}>
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className={`rounded-circle bg-${card.color} bg-opacity-10 p-3 me-3`}>
                    <i className={`bi ${card.icon} text-${card.color} fs-4`}></i>
                  </div>
                  <div>
                    <h6 className="card-subtitle mb-1 text-muted">{card.title}</h6>
                    {loading ? (
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    ) : (
                      <h3 className={`mb-0 text-${card.color}`}>
                        {index === 2 && card.value >= 0 ? '+' : ''}
                        {formatCurrency(Math.abs(card.value))}
                      </h3>
                    )}
                  </div>
                </div>
                {index === 2 && (
                  <div className="text-end mt-2">
                    <small className={`text-${card.value >= 0 ? 'success' : 'danger'}`}>
                      {card.value >= 0 ? 'You are owed money' : 'You owe money'}
                    </small>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Activities */}
      <div className="row mb-4 g-3">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
              <h5 className="card-title mb-0 fw-bold">
                <i className="bi bi-graph-up-arrow me-2 text-primary"></i>
                Expense Analytics
              </h5>
              <div>
                <select
                  className="form-select form-select-sm"
                  value={selectedGroup || ''}
                  onChange={(e) => setSelectedGroup(e.target.value !== '' ? e.target.value : null)}
                  style={{ minWidth: '180px' }}
                >
                  <option value="" disabled>Select Group</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="card border-0 mb-3">
                    <div className="card-body">
                      <h6 className="text-center fw-bold mb-3">Balance Distribution</h6>
                      {loading ? (
                        <div className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ height: 220 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            {generateBalanceData().length > 0 ? (
                              <PieChart>
                                <Pie
                                  activeIndex={activeBalanceIndex}
                                  activeShape={renderActiveShape}
                                  data={generateBalanceData()}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={55}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                  onMouseEnter={(_, index) => setActiveBalanceIndex(index)}
                                >
                                  {generateBalanceData().map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={index === 0 ? '#4F46E5' : '#EF4444'}
                                    />
                                  ))}
                                </Pie>
                              </PieChart>
                            ) : (
                              <div className="d-flex align-items-center justify-content-center h-100">
                                <div className="text-center">
                                  <i className="bi bi-pie-chart text-muted" style={{ fontSize: '3rem' }}></i>
                                  <p className="mt-3 text-muted">No balance data available</p>
                                </div>
                              </div>
                            )}
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-0">
                    <div className="card-body">
                      <h6 className="text-center fw-bold mb-3">
                        {selectedGroup ?
                          `${groups.find(g => g.id == selectedGroup)?.name || 'Group'} Expenses by User` :
                          'Select a Group to View Expenses'}
                      </h6>
                      {groupExpenseLoading ? (
                        <div className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ height: 220 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            {generateGroupExpenseData().length > 0 ? (
                              <BarChart
                                data={generateGroupExpenseData()}
                                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={(value) => `$${value}`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="Expense Share">
                                  {generateGroupExpenseData().map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]}
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            ) : (
                              <div className="d-flex align-items-center justify-content-center h-100">
                                <div className="text-center">
                                  <i className="bi bi-bar-chart text-muted" style={{ fontSize: '3rem' }}></i>
                                  <p className="mt-3 text-muted">
                                    {selectedGroup ? 'No expense data available' : 'Select a group to view expenses'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Group Expense Summary */}
              {selectedGroup && groupExpenses.length > 0 && (
                <div className="mt-3">
                  <h6 className="fw-bold mb-3">Group Expense Details</h6>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Description</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Split With</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupExpenses.slice(0, 4).map(expense => (
                          <tr key={expense.id}>
                            <td>{expense.description}</td>
                            <td>{formatDate(expense.date)}</td>
                            <td>{formatCurrency(expense.amount)}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                {expense.splits.map((split, index) => (
                                  <span
                                    key={split.id}
                                    className="badge bg-light text-dark me-1"
                                    title={`${split.user.name}: ${formatCurrency(split.share)}`}
                                  >
                                    {split.user.name.split(' ')[0]}
                                    {index < expense.splits.length - 1 ? ',' : ''}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {groupExpenses.length > 4 && (
                      <div className="text-center mt-2">
                        <Link to="/dashboard/expenses" className="btn btn-sm btn-outline-primary">
                          View all {groupExpenses.length} expenses
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
              <h5 className="card-title mb-0 fw-bold">
                <i className="bi bi-clock-history me-2 text-primary"></i>
                Recent Activity
              </h5>
              <div className="btn-group" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${activeTab === 'activity' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveTab('activity')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${activeTab === 'expenses' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveTab('expenses')}
                >
                  Expenses
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading recent activity...</p>
                </div>
              ) : summary.recentExpenses.length === 0 && summary.recentSettlements.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-clipboard-data text-muted" style={{ fontSize: '3rem' }}></i>
                  <p className="text-muted my-3">No recent activity found</p>
                  <Link to="/dashboard/expenses" className="btn btn-sm btn-primary">Add Your First Expense</Link>
                </div>
              ) : (
                <div className="activity-timeline p-3">
                  {(activeTab === 'activity' || activeTab === 'expenses') &&
                    summary.recentExpenses.map((expense, index) => (
                      <div key={`expense-${expense.id || index}`} className="activity-item d-flex mb-3 pb-3 border-bottom">
                        <div className={`activity-icon rounded-circle bg-primary bg-opacity-10 p-2 d-flex align-items-center justify-content-center me-3`} style={{ width: '40px', height: '40px' }}>
                          <i className="bi bi-receipt text-primary"></i>
                        </div>
                        <div className="activity-content flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center">
                            <h6 className="mb-1 fw-bold">{expense.description}</h6>
                            <span className={`badge ${expense.paidByUserId === user.id ? 'bg-success' : 'bg-warning'}`}>
                              {formatCurrency(expense.amount)}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between text-muted small">
                            <span>
                              <i className="bi bi-people me-1"></i> {expense.groupName}
                            </span>
                            <span>
                              <i className="bi bi-calendar-date me-1"></i> {formatDate(expense.date)}
                            </span>
                          </div>
                          <small className="text-muted">
                            {expense.paidByUserId === user.id ? 'You paid' : `Paid by ${expense.paidByUserName || 'someone'}`}
                          </small>
                        </div>
                      </div>
                    ))
                  }

                  {activeTab === 'activity' &&
                    summary.recentSettlements.map((settlement, index) => (
                      <div key={`settlement-${settlement.id || index}`} className="activity-item d-flex mb-3 pb-3 border-bottom">
                        <div className={`activity-icon rounded-circle bg-success bg-opacity-10 p-2 d-flex align-items-center justify-content-center me-3`} style={{ width: '40px', height: '40px' }}>
                          <i className="bi bi-cash text-success"></i>
                        </div>
                        <div className="activity-content flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center">
                            <h6 className="mb-1 fw-bold">Settlement</h6>
                            <span className={`badge ${settlement.fromUserId === user.id ? 'bg-danger' : 'bg-success'}`}>
                              {formatCurrency(settlement.amount)}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between text-muted small">
                            <span>
                              <i className="bi bi-people me-1"></i> {settlement.groupName}
                            </span>
                            <span>
                              <i className="bi bi-calendar-date me-1"></i> {formatDate(settlement.date)}
                            </span>
                          </div>
                          <small className="text-muted">
                            {settlement.fromUserId === user.id
                              ? `You paid ${settlement.toUserName || 'someone'}`
                              : `${settlement.fromUserName || 'Someone'} paid you`}
                          </small>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* My Groups & Quick Actions */}
      <div className="row g-3">
        <div className="col-lg-6 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
              <h5 className="card-title mb-0 fw-bold">
                <i className="bi bi-people me-2 text-primary"></i>
                My Groups
              </h5>
              <Link to="/dashboard/groups" className="btn btn-sm btn-outline-primary">
                View All
              </Link>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading groups...</p>
                </div>
              ) : !Array.isArray(groups) || groups.length === 0 ? (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <i className="bi bi-people-fill text-muted" style={{ fontSize: '3rem' }}></i>
                  </div>
                  <p className="text-muted mb-3">You don't have any groups yet</p>
                  <Link to="/dashboard/groups" className="btn btn-primary">
                    <i className="bi bi-plus-circle me-2"></i>
                    Create Group
                  </Link>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {groups.slice(0, 5).map((group) => (
                    <div
                      key={group.id}
                      className="list-group-item"
                      onClick={() => setSelectedGroup(group.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex align-items-center">
                        <div
                          className={`group-avatar me-3 rounded-circle ${selectedGroup == group.id
                              ? 'bg-primary text-white'
                              : 'bg-primary bg-opacity-10 text-primary'
                            } d-flex align-items-center justify-content-center`}
                          style={{
                            width: '45px',
                            height: '45px',
                            fontSize: '1.2rem',
                          }}
                        >
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center">
                            <h6 className="mb-0 fw-bold">{group.name}</h6>
                            {selectedGroup == group.id && (
                              <span className="badge bg-primary rounded-pill">
                                {groupExpenses.length} expenses
                              </span>
                            )}
                          </div>
                          <small className="text-muted">
                            {group.members?.length || 0} members
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                  {groups.length > 5 && (
                    <div className="text-center py-2">
                      <Link
                        to="/dashboard/groups"
                        className="btn btn-link btn-sm text-decoration-none"
                      >
                        See {groups.length - 5} more groups
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h5 className="card-title mb-0 fw-bold">
                <i className="bi bi-lightning-charge me-2 text-warning"></i>
                Quick Actions
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {[
                  { title: 'Add Expense', icon: 'bi-receipt', color: 'primary', link: '/dashboard/expenses' },
                  { title: 'Record Settlement', icon: 'bi-cash-coin', color: 'success', link: '/dashboard/settlements' },
                  { title: 'Create Group', icon: 'bi-people', color: 'info', link: '/dashboard/groups' },
                  { title: 'View Reports', icon: 'bi-graph-up', color: 'warning', link: '/dashboard/reports' }
                ].map((action) => (
                  <div className="col-6" key={action.title}>
                    <Link to={action.link} className={`card bg-${action.color} bg-opacity-10 text-${action.color} text-decoration-none h-100 hover-shadow`}>
                      <div className="card-body d-flex flex-column align-items-center justify-content-center p-3">
                        <i className={`bi ${action.icon} fs-1 mb-2`}></i>
                        <h6 className="mb-0">{action.title}</h6>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;