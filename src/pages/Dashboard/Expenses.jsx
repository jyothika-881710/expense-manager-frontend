import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const Expenses = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [notifyingExpenseIds, setNotifyingExpenseIds] = useState([]);

  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    payerId: '',
    groupId: '',
    splits: []
  });

  // Create a function to get auth headers for all requests - same as in Groups component
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
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      fetchExpenses(selectedGroup.id);
      extractGroupMembers(selectedGroup);
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (groupMembers.length > 0 && expenseForm.payerId) {
      // Create initial equal splits when payer changes
      createEqualSplits();
    }
  }, [groupMembers, expenseForm.payerId]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      // Fixed: Added proper URL prefix and authorization headers
      const response = await axios.get(
        `http://localhost:8080/api/groups/my-groups?adminEmail=${user.email}`,
        { headers: getAuthHeaders() }
      );

      // Added handling for nested data structure - similar to Groups component
      const groupsData = Array.isArray(response.data)
        ? response.data
        : (response.data?.data && Array.isArray(response.data.data))
          ? response.data.data
          : [];

      setGroups(groupsData);
    } catch (error) {
      toast.error('Failed to fetch groups');
      console.error('Error fetching groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const extractGroupMembers = (group) => {
    if (group && group.members) {
      // Filter only accepted members and ensure we have correct user data
      const acceptedMembers = group.members
        .filter(member => member.accepted && member.user)
        .map(member => ({
          id: member.user.id,
          name: member.user.name || member.user.email || 'Unknown User',
          email: member.user.email || null
        }));

      console.log('Extracted group members:', acceptedMembers);
      setGroupMembers(acceptedMembers);
    } else {
      console.error('Group missing members array:', group);
      setGroupMembers([]);
    }
  };

  const handleGroupChange = (e) => {
    const groupId = parseInt(e.target.value);
    const group = groups.find(g => g.id === groupId);
    setSelectedGroup(group);
    setExpenseForm({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      payerId: '',
      groupId: groupId.toString(),
      splits: []
    });
  };

  const createEqualSplits = () => {
    if (!groupMembers.length || !expenseForm.amount) return;

    const equalAmount = expenseForm.amount ? parseFloat(expenseForm.amount) / groupMembers.length : 0;

    const splits = groupMembers.map(member => ({
      userId: member.id,
      amount: equalAmount.toFixed(2),
      percentage: (100 / groupMembers.length).toFixed(2),
      isCustomAmount: false
    }));

    setExpenseForm({
      ...expenseForm,
      splits: splits
    });
  };

  const handleSplitTypeChange = (e) => {
    const splitType = e.target.value;

    let newSplits = [...expenseForm.splits];

    if (splitType === 'equal') {
      const equalAmount = expenseForm.amount ? parseFloat(expenseForm.amount) / groupMembers.length : 0;

      newSplits = groupMembers.map(member => ({
        userId: member.id,
        amount: equalAmount.toFixed(2),
        percentage: (100 / groupMembers.length).toFixed(2),
        isCustomAmount: false
      }));
    } else if (splitType === 'percentage') {
      newSplits = groupMembers.map(member => ({
        ...member.split,
        userId: member.id,
        percentage: (100 / groupMembers.length).toFixed(2),
        amount: ((parseFloat(expenseForm.amount) * (100 / groupMembers.length)) / 100).toFixed(2),
        isCustomAmount: false
      }));
    } else if (splitType === 'custom') {
      newSplits = groupMembers.map(member => ({
        ...member.split,
        userId: member.id,
        amount: '0.00',
        percentage: 0,
        isCustomAmount: true
      }));
    }

    setExpenseForm({
      ...expenseForm,
      splits: newSplits
    });
  };

  const handleSplitAmountChange = (userId, value) => {
    const newSplits = expenseForm.splits.map(split => {
      if (split.userId === userId) {
        const amount = parseFloat(value) || 0;
        return {
          ...split,
          amount: amount.toFixed(2),
          percentage: expenseForm.amount ? ((amount / parseFloat(expenseForm.amount)) * 100).toFixed(2) : 0
        };
      }
      return split;
    });

    setExpenseForm({
      ...expenseForm,
      splits: newSplits
    });
  };

  const handleSplitPercentageChange = (userId, value) => {
    const percentage = parseFloat(value) || 0;

    const newSplits = expenseForm.splits.map(split => {
      if (split.userId === userId) {
        return {
          ...split,
          percentage: percentage.toFixed(2),
          amount: expenseForm.amount ? ((percentage / 100) * parseFloat(expenseForm.amount)).toFixed(2) : 0
        };
      }
      return split;
    });

    setExpenseForm({
      ...expenseForm,
      splits: newSplits
    });
  };

  const handleAmountChange = (e) => {
    const amount = e.target.value;
    setExpenseForm({
      ...expenseForm,
      amount
    });

    // Update split amounts based on the new total
    if (expenseForm.splits.length > 0) {
      const newSplits = expenseForm.splits.map(split => {
        return {
          ...split,
          amount: split.isCustomAmount
            ? split.amount
            : ((parseFloat(split.percentage) / 100) * parseFloat(amount)).toFixed(2)
        };
      });

      setExpenseForm(prev => ({
        ...prev,
        splits: newSplits
      }));
    }
  };

  const sendExpenseNotification = async (expenseId) => {
    try {
      // Add the expense ID to the list of currently notifying expenses
      setNotifyingExpenseIds(prev => [...prev, expenseId]);

      await axios.post(
        `http://localhost:8080/api/expenses/notify/${expenseId}`,
        {},
        { headers: getAuthHeaders() }
      );

      toast.success('Notifications sent successfully');
    } catch (error) {
      toast.error('Failed to send notifications: ' + (error.response?.data?.message || error.message));
      console.error('Error sending notifications:', error);
    } finally {
      // Remove the expense ID from the list of notifying expenses
      setNotifyingExpenseIds(prev => prev.filter(id => id !== expenseId));
    }
  };


  // Replace your handleExpenseSubmit function with this improved version
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();

    try {
      // Validate that splits add up to total amount
      const totalSplitAmount = expenseForm.splits.reduce(
        (sum, split) => sum + parseFloat(split.amount), 0
      );

      if (Math.abs(totalSplitAmount - parseFloat(expenseForm.amount)) > 0.01) {
        toast.error('Split amounts must add up to the total expense amount');
        return;
      }

      // Find the payer's email
      const payer = groupMembers.find(member => member.id && member.id.toString() === expenseForm.payerId);

      if (!payer || !payer.email) {
        toast.error('Payer information is missing or incomplete');
        console.error('Payer object:', payer);
        return;
      }

      // Transform splits with error checking
      const formattedSplits = [];
      for (const split of expenseForm.splits) {
        const user = groupMembers.find(member =>
          member.id && split.userId && member.id.toString() === split.userId.toString()
        );

        if (!user || !user.email) {
          toast.error(`User information is missing for split (user ID: ${split.userId})`);
          console.error('Missing user for split:', split);
          return;
        }

        formattedSplits.push({
          userEmail: user.email,
          share: parseFloat(split.amount)
        });
      }

      const payload = {
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description,
        date: expenseForm.date,
        payerEmail: payer.email,
        groupId: parseInt(expenseForm.groupId),
        splits: formattedSplits,
        receiptUrl: null
      };

      // Set loading state to true before API call
      setIsSubmittingExpense(true);

      const response = await axios.post(
        'http://localhost:8080/api/expenses/add',
        payload,
        { headers: getAuthHeaders() }
      );

      // Reset form first to improve perceived performance
      setExpenseForm({
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        payerId: '',
        groupId: expenseForm.groupId,
        splits: []
      });

      toast.success('Expense recorded successfully');

      // Refresh the complete expense list to ensure all data is correct
      await fetchExpenses(selectedGroup.id);

    } catch (error) {
      toast.error('Failed to record expense: ' + (error.response?.data?.message || error.message));
      console.error('Error recording expense:', error);
    } finally {
      // Always reset loading state when done
      setIsSubmittingExpense(false);
    }
  };

  // Update the fetchExpenses function to properly handle errors and empty responses
  const fetchExpenses = async (groupId) => {
    try {
      setExpenseLoading(true);

      const response = await axios.get(
        `http://localhost:8080/api/expenses/group/${groupId}`,
        { headers: getAuthHeaders() }
      );

      // Added handling for nested data structure
      const expensesData = Array.isArray(response.data)
        ? response.data
        : (response.data?.data && Array.isArray(response.data.data))
          ? response.data.data
          : [];

      console.log('Fetched expenses:', expensesData);
      setExpenses(expensesData);
    } catch (error) {
      toast.error('Failed to fetch expenses');
      console.error('Error fetching expenses:', error);
      setExpenses([]);
    } finally {
      setExpenseLoading(false);
    }
  };

  return (
    <div className="container">
      <h2 className="mb-4">Expenses</h2>

      {/* Group Selection */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Select Group</h5>
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
                  onChange={handleGroupChange}
                >
                  <option value="">Select a group</option>
                  {/* Fixed: Added Array.isArray check before mapping */}
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
      </div>

      {selectedGroup && (
        <>
          {/* Add Expense Form */}
          <div className="row mb-4">
            <div className="col-lg-12">
              <div className="card">
                <div className="card-header bg-success text-white">
                  <h5 className="mb-0">Add New Expense</h5>
                </div>
                <div className="card-body">
                  <form onSubmit={handleExpenseSubmit}>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="description" className="form-label">Description</label>
                        <input
                          type="text"
                          className="form-control"
                          id="description"
                          placeholder="What was this expense for?"
                          value={expenseForm.description}
                          onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                          required
                        />
                      </div>

                      <div className="col-md-3 mb-3">
                        <label htmlFor="amount" className="form-label">Amount</label>
                        <div className="input-group">
                          <span className="input-group-text">$</span>
                          <input
                            type="number"
                            className="form-control"
                            id="amount"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            value={expenseForm.amount}
                            onChange={handleAmountChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-md-3 mb-3">
                        <label htmlFor="date" className="form-label">Date</label>
                        <input
                          type="date"
                          className="form-control"
                          id="date"
                          value={expenseForm.date}
                          onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="payerId" className="form-label">Paid By</label>
                        <select
                          className="form-select"
                          id="payerId"
                          value={expenseForm.payerId}
                          onChange={(e) => setExpenseForm({ ...expenseForm, payerId: e.target.value })}
                          required
                        >
                          <option value="">Select Payer</option>
                          {groupMembers.map(member => (
                            <option key={member.id || Math.random().toString(36).substr(2, 9)} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="splitType" className="form-label">Split Type</label>
                        <select
                          className="form-select"
                          id="splitType"
                          onChange={handleSplitTypeChange}
                          disabled={!expenseForm.payerId || !expenseForm.amount}
                        >
                          <option value="equal">Split Equally</option>
                          <option value="percentage">Split by Percentage</option>
                          <option value="custom">Custom Amount</option>
                        </select>
                      </div>
                    </div>

                    {expenseForm.splits.length > 0 && (
                      <div className="card mb-3">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">Split Details</h6>
                        </div>
                        <div className="card-body">
                          <div className="table-responsive">
                            <table className="table table-sm">
                              <thead>
                                <tr>
                                  <th>Member</th>
                                  <th>Amount ($)</th>
                                  <th>Percentage (%)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {expenseForm.splits.map(split => {
                                  const member = groupMembers.find(m => m.id === split.userId);
                                  return (
                                    <tr key={split.userId || Math.random().toString(36).substr(2, 9)}>
                                      <td>{member?.name}</td>
                                      <td>
                                        <input
                                          type="number"
                                          className="form-control form-control-sm"
                                          min="0"
                                          step="0.01"
                                          value={split.amount}
                                          onChange={(e) => handleSplitAmountChange(split.userId, e.target.value)}
                                        />
                                      </td>
                                      <td>
                                        <input
                                          type="number"
                                          className="form-control form-control-sm"
                                          min="0"
                                          max="100"
                                          step="0.01"
                                          value={split.percentage}
                                          onChange={(e) => handleSplitPercentageChange(split.userId, e.target.value)}
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="table-light">
                                  <th>Total</th>
                                  <th>
                                    $
                                    {expenseForm.splits
                                      .reduce((sum, split) => sum + parseFloat(split.amount), 0)
                                      .toFixed(2)}
                                  </th>
                                  <th>
                                    {expenseForm.splits
                                      .reduce((sum, split) => sum + parseFloat(split.percentage), 0)
                                      .toFixed(2)}%
                                  </th>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-end">
                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={
                          isSubmittingExpense ||
                          !expenseForm.payerId ||
                          !expenseForm.amount ||
                          !expenseForm.description ||
                          !expenseForm.splits.length
                        }
                      >
                        {isSubmittingExpense ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Processing...
                          </>
                        ) : (
                          'Add Expense'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses List */}
          <div className="row">
            <div className="col-lg-12">
              <div className="card">
                <div className="card-header bg-dark text-white">
                  <h5 className="mb-0">Expenses for {selectedGroup.name}</h5>
                </div>
                <div className="card-body">
                  {expenseLoading ? (
                    <div className="d-flex justify-content-center">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : !Array.isArray(expenses) || expenses.length === 0 ? (
                    <div className="alert alert-info">No expenses recorded for this group yet.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-striped table-hover">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Splits</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map(expense => (
                            <tr key={expense.id || Math.random().toString(36).substr(2, 9)}>
                              <td>{new Date(expense.date).toLocaleDateString()}</td>
                              <td>{expense.description}</td>
                              <td>${parseFloat(expense.amount).toFixed(2)}</td>
                              <td>
                                <div className="d-flex gap-2">
                                  <button
                                    className="btn btn-sm btn-outline-info"
                                    type="button"
                                    data-bs-toggle="collapse"
                                    data-bs-target={`#expense-${expense.id}`}
                                    aria-expanded="false"
                                  >
                                    View Details
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-warning"
                                    type="button"
                                    onClick={() => sendExpenseNotification(expense.id)}
                                    disabled={notifyingExpenseIds.includes(expense.id)}
                                  >
                                    {notifyingExpenseIds.includes(expense.id) ? (
                                      <>
                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                        Sending...
                                      </>
                                    ) : (
                                      <>Notify Users</>
                                    )}
                                  </button>
                                </div>
                                <div className="collapse mt-2" id={`expense-${expense.id}`}>
                                  <div className="card card-body p-2">
                                    <small>
                                      <ul className="list-unstyled mb-0">
                                        {expense.splits && Array.isArray(expense.splits) && expense.splits.map(split => (
                                          <li key={split.id} className="mb-1">
                                            <strong>{split.user?.name || split.user?.email}:</strong> ${parseFloat(split.share).toFixed(2)}
                                            {' '}
                                            <span className={parseFloat(split.user?.balance) > 0 ? 'badge bg-success' : 'badge bg-danger'}>
                                              {parseFloat(split.user?.balance) > 0 ? 'Paid' : 'Owes'}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </small>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Expenses;