import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const Settlements = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [settlementForm, setSettlementForm] = useState({
    payerId: '',
    payeeId: '',
    payerEmail: '',
    payeeEmail: '',
    amount: '',
    groupId: ''
  });
  const [loading, setLoading] = useState(false);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Create a function to get auth headers for all requests
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
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
      fetchSettlements(selectedGroup.id);
      extractGroupMembers(selectedGroup);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:8080/api/groups/my-groups?adminEmail=${user.email}`,
        { headers: getAuthHeaders() }
      );
      
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

  const fetchSettlements = async (groupId) => {
    try {
      setSettlementLoading(true);
      const response = await axios.get(
        `http://localhost:8080/api/settlements/group/${groupId}`,
        { headers: getAuthHeaders() }
      );
      
      const settlementsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data && Array.isArray(response.data.data)) 
          ? response.data.data 
          : [];
      
      setSettlements(settlementsData);
      setSettlementLoading(false);
    } catch (error) {
      toast.error('Failed to fetch settlements');
      console.error('Error fetching settlements:', error);
      setSettlements([]);
      setSettlementLoading(false);
    }
  };

  const extractGroupMembers = (group) => {
    if (group && group.members) {
      const acceptedMembers = group.members
        .filter(member => member.accepted)
        .map(member => ({
          id: member.user?.id,
          name: member.user?.name || member.user?.email,
          email: member.user?.email
        }))
        .filter(member => member.id && member.email); // Ensure we only include members with valid IDs and emails
      
      setGroupMembers(acceptedMembers);
    } else {
      setGroupMembers([]);
    }
  };

  const handleGroupChange = (e) => {
    const groupId = parseInt(e.target.value);
    const group = groups.find(g => g.id === groupId);
    setSelectedGroup(group);
    setSettlementForm({
      payerId: '',
      payeeId: '',
      payerEmail: '',
      payeeEmail: '',
      amount: '',
      groupId: groupId.toString()
    });
  };

  const handlePayerChange = (e) => {
    const payerId = e.target.value;
    const selectedPayer = groupMembers.find(member => member.id === parseInt(payerId));
    setSettlementForm({
      ...settlementForm, 
      payerId: payerId,
      payerEmail: selectedPayer ? selectedPayer.email : ''
    });
  };

  const handlePayeeChange = (e) => {
    const payeeId = e.target.value;
    const selectedPayee = groupMembers.find(member => member.id === parseInt(payeeId));
    setSettlementForm({
      ...settlementForm, 
      payeeId: payeeId,
      payeeEmail: selectedPayee ? selectedPayee.email : ''
    });
  };

  const handleSettlementSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      const payload = {
        payerEmail: settlementForm.payerEmail,  // Send email instead of ID
        payeeEmail: settlementForm.payeeEmail,  // Send email instead of ID
        amount: parseFloat(settlementForm.amount),
        groupId: parseInt(settlementForm.groupId)
      };
      
      const response = await axios.post(
        'http://localhost:8080/api/settlements/record', 
        payload,
        { headers: getAuthHeaders() }
      );
      
      // Handle both direct data and data nested in response
      const newSettlement = response.data?.data || response.data;
      
      // Update settlements list if we got a valid settlement object
      if (newSettlement && typeof newSettlement === 'object') {
        setSettlements(prevSettlements => [...prevSettlements, newSettlement]);
      }
      
      // Reset form
      setSettlementForm({
        ...settlementForm,
        payerId: '',
        payeeId: '',
        payerEmail: '',
        payeeEmail: '',
        amount: ''
      });
      
      toast.success('Settlement recorded successfully');
    } catch (error) {
      toast.error('Failed to record settlement');
      console.error('Error recording settlement:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="container">
      <h2 className="mb-4">Settlements</h2>
      
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
          {/* Record Settlement */}
          <div className="row mb-4">
            <div className="col-lg-12">
              <div className="card">
                <div className="card-header bg-success text-white">
                  <h5 className="mb-0">Record Settlement</h5>
                </div>
                <div className="card-body">
                  <form onSubmit={handleSettlementSubmit}>
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label htmlFor="payerId" className="form-label">Payer</label>
                        <select 
                          className="form-select" 
                          id="payerId"
                          value={settlementForm.payerId}
                          onChange={handlePayerChange}
                          required
                        >
                          <option value="">Select Payer</option>
                          {groupMembers.map(member => (
                            <option key={member.id || Math.random().toString(36).substr(2, 9)} value={member.id}>
                              {member.name || member.email || 'Unknown Member'}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="col-md-4 mb-3">
                        <label htmlFor="payeeId" className="form-label">Payee</label>
                        <select 
                          className="form-select" 
                          id="payeeId"
                          value={settlementForm.payeeId}
                          onChange={handlePayeeChange}
                          required
                        >
                          <option value="">Select Payee</option>
                          {groupMembers
                            .filter(member => member.id !== parseInt(settlementForm.payerId))
                            .map(member => (
                              <option key={member.id || Math.random().toString(36).substr(2, 9)} value={member.id}>
                                {member.name || member.email || 'Unknown Member'}
                              </option>
                            ))
                          }
                        </select>
                      </div>
                      
                      <div className="col-md-4 mb-3">
                        <label htmlFor="amount" className="form-label">Amount</label>
                        <div className="input-group">
                          <span className="input-group-text">$</span>
                          <input 
                            type="number" 
                            className="form-control" 
                            id="amount"
                            min="0.01"
                            step="0.01"
                            value={settlementForm.amount}
                            onChange={(e) => setSettlementForm({...settlementForm, amount: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-end">
                      <button 
                        type="submit" 
                        className="btn btn-success"
                        disabled={!settlementForm.payerId || !settlementForm.payeeId || !settlementForm.amount || submitting}
                      >
                        {submitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Processing...
                          </>
                        ) : (
                          'Record Settlement'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          
          {/* Settlements List */}
          <div className="row">
            <div className="col-lg-12">
              <div className="card">
                <div className="card-header bg-dark text-white">
                  <h5 className="mb-0">Settlements for {selectedGroup.name}</h5>
                </div>
                <div className="card-body">
                  {settlementLoading ? (
                    <div className="d-flex justify-content-center">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : !Array.isArray(settlements) || settlements.length === 0 ? (
                    <div className="alert alert-info">No settlements found for this group.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-striped table-hover">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Payer</th>
                            <th>Payee</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settlements.map(settlement => (
                            <tr key={settlement.id || Math.random().toString(36).substr(2, 9)}>
                              <td>{formatDate(settlement.date)}</td>
                              <td>{settlement.payer?.name || settlement.payer?.email || 'Unknown'}</td>
                              <td>{settlement.payee?.name || settlement.payee?.email || 'Unknown'}</td>
                              <td>${typeof settlement.amount === 'number' ? settlement.amount.toFixed(2) : 'N/A'}</td>
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

export default Settlements;