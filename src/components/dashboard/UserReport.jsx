import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { user, token } = useAuth(); // Ensure token is available here
  const [summary, setSummary] = useState({
    totalSpent: 0,
    totalOwed: 0,
    netBalance: 0,
    recentExpenses: [],
    recentSettlements: []
  });
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    if (user && user.id && token) {
      fetchUserSummary();
      fetchGroups();
    }
  }, [user, token]);

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
        `http://localhost:8083/api/reports/user/${user.id}`,
        authHeaders
      );

      let recentExpenses = [];
      let recentSettlements = [];

      if (response.data && response.data.groupReports) {
        const allExpenses = [];
        response.data.groupReports.forEach(group => {
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
        response.data.groupReports.forEach(group => {
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
      }

      setSummary({
        totalSpent: response.data.totalSpent || 0,
        totalOwed: response.data.totalOwed || 0,
        netBalance: response.data.netBalance || 0,
        recentExpenses,
        recentSettlements
      });

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
        `http://localhost:8083/api/groups/my-groups?adminEmail=${user.email}`,
        authHeaders
      );
      setGroups(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
    }
  };

  return (
    <div className="container">
      {/* Summary Cards */}
      <div className="row mb-4">
        {['Total Spent', 'Total Owed', 'Net Balance'].map((title, index) => {
          const value = [summary.totalSpent, summary.totalOwed, summary.netBalance][index];
          const color = index === 2
            ? value >= 0 ? 'text-success' : 'text-danger'
            : '';
          return (
            <div className="col-md-4" key={title}>
              <div className="card">
                <div className="card-body text-center">
                  <h5 className="card-title">{title}</h5>
                  {loading ? (
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  ) : (
                    <h2 className={`mb-0 ${color}`}>
                      {index === 2 && value >= 0 ? '+' : ''}
                      ${Math.abs(value).toFixed(2)}
                    </h2>
                  )}
                  {index === 2 && (
                    <small className="text-muted">
                      {value >= 0 ? 'You are owed' : 'You owe'}
                    </small>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* My Groups & Recent Activity */}
      <div className="row mb-4">
        {/* My Groups */}
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">My Groups</h5>
              <Link to="/dashboard/groups" className="btn btn-sm btn-light">View All</Link>
            </div>
            <div className="card-body">
              {!Array.isArray(groups) || groups.length === 0 ? (
                <div className="text-center p-3">
                  <p className="mb-3">You don't have any groups yet.</p>
                  <Link to="/dashboard/groups" className="btn btn-primary">Create Group</Link>
                </div>
              ) : (
                <div className="list-group">
                  {groups.slice(0, 5).map(group => (
                    <Link
                      key={group.id}
                      to={`/dashboard/groups/${group.id}`}
                      className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <h6 className="mb-1">{group.name}</h6>
                        <small>{group.members?.length || 0} members</small>
                      </div>
                      <span className="badge bg-primary rounded-pill">
                        {group.expenses?.length || 0} expenses
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Activity</h5>
              <Link to="/dashboard/expenses" className="btn btn-sm btn-light">View All</Link>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center p-3">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : summary.recentExpenses.length === 0 && summary.recentSettlements.length === 0 ? (
                <div className="text-center p-3">
                  <p className="mb-3">No recent activity.</p>
                  <Link to="/dashboard/expenses" className="btn btn-success">Add Expense</Link>
                </div>
              ) : (
                <div className="list-group">
                  {summary.recentExpenses.map(expense => (
                    <div key={`expense-${expense.id}`} className="list-group-item">
                      <div className="d-flex justify-content-between">
                        <h6 className="mb-1">{expense.description}</h6>
                        <span className={`badge ${expense.paidByUserId === user.id ? 'bg-success' : 'bg-warning'}`}>
                          ${expense.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <small className="text-muted">
                          {expense.groupName} • {new Date(expense.date).toLocaleDateString()}
                        </small>
                        <small>
                          {expense.paidByUserId === user.id ? 'You paid' : `Paid by ${expense.paidByUserName || 'someone'}`}
                        </small>
                      </div>
                    </div>
                  ))}
                  {summary.recentSettlements.map(settlement => (
                    <div key={`settlement-${settlement.id}`} className="list-group-item">
                      <div className="d-flex justify-content-between">
                        <h6 className="mb-1">Settlement</h6>
                        <span className={`badge ${settlement.fromUserId === user.id ? 'bg-danger' : 'bg-success'}`}>
                          ${settlement.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <small className="text-muted">
                          {settlement.groupName} • {new Date(settlement.date).toLocaleDateString()}
                        </small>
                        <small>
                          {settlement.fromUserId === user.id
                            ? `You paid ${settlement.toUserName || 'someone'}`
                            : `${settlement.fromUserName || 'Someone'} paid you`}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3 col-sm-6">
                  <Link to="/dashboard/expenses" className="btn btn-outline-primary w-100">
                    <i className="bi bi-receipt me-2"></i>
                    Add Expense
                  </Link>
                </div>
                <div className="col-md-3 col-sm-6">
                  <Link to="/dashboard/settlements" className="btn btn-outline-success w-100">
                    <i className="bi bi-cash-coin me-2"></i>
                    Record Settlement
                  </Link>
                </div>
                <div className="col-md-3 col-sm-6">
                  <Link to="/dashboard/groups" className="btn btn-outline-info w-100">
                    <i className="bi bi-people me-2"></i>
                    Create Group
                  </Link>
                </div>
                <div className="col-md-3 col-sm-6">
                  <Link to="/dashboard/reports" className="btn btn-outline-warning w-100">
                    <i className="bi bi-graph-up me-2"></i>
                    View Reports
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
