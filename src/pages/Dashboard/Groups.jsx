import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';



const Groups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupIdToJoin, setGroupIdToJoin] = useState('');
  const [activeTab, setActiveTab] = useState('myGroups'); // Tabs: myGroups, create, join, invite, groupDetails
  const [selectedGroupForDetails, setSelectedGroupForDetails] = useState(null);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const navigate = useNavigate();
  const [inviteSending, setInviteSending] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);

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
      fetchPendingInvitations();
    }
  }, [user]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:8080/api/groups/my-groups?adminEmail=${user.email}`,
        { headers: getAuthHeaders() }
      );

      let groupsData = Array.isArray(response.data)
        ? response.data
        : (response.data?.data && Array.isArray(response.data.data))
          ? response.data.data
          : [];

      setGroups(groupsData);
    } catch (error) {
      toast.error('Failed to load groups');
      console.error('Error fetching groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteGroup = (group) => {
    setGroupToDelete(group);
    setShowDeleteModal(true);
  };

  const fetchPendingInvitations = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8080/api/groups/pending-invitations?email=${user.email}`,
        { headers: getAuthHeaders() }
      );

      const invitations = Array.isArray(response.data)
        ? response.data
        : (response.data?.data && Array.isArray(response.data.data))
          ? response.data.data
          : [];

      setPendingInvitations(invitations);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      setPendingInvitations([]);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `http://localhost:8080/api/groups/create?adminEmail=${user.email}`,
        newGroup,
        { headers: getAuthHeaders() }
      );

      // Auto-join the created group
      const createdGroupId = response.data.id || response.data.groupId;
      if (createdGroupId) {
        // Add the current user as a member automatically
        await axios.post(
          `http://localhost:8080/api/groups/${createdGroupId}/add-member`,
          {
            email: user.email,
            name: user.name || user.email,
            accepted: true
          },
          { headers: getAuthHeaders() }
        );
      }

      toast.success('Group created successfully!');
      setNewGroup({ name: '', description: '' });
      fetchGroups(); // Refresh groups list
      setActiveTab('myGroups'); // Switch back to groups list
    } catch (error) {
      toast.error('Failed to create group');
      console.error('Error creating group:', error);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!selectedGroup) {
      toast.warning('Please select a group first');
      return;
    }

    try {
      setInviteSending(true); // Start loading

      await axios.post(
        'http://localhost:8080/api/groups/invite',
        {
          groupId: selectedGroup.id,
          email: inviteEmail
        },
        { headers: getAuthHeaders() }
      );
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      fetchGroups(); // Refresh groups
    } catch (error) {
      toast.error('Failed to send invitation');
      console.error('Error inviting user:', error);
    } finally {
      setInviteSending(false); // End loading regardless of outcome
    }
  };

  const handleAcceptInvite = async (groupId) => {
    try {
      await axios.post(
        `http://localhost:8080/api/groups/${groupId}/accept?email=${user.email}`,
        {},
        { headers: getAuthHeaders() }
      );
      toast.success('Invitation accepted successfully!');
      fetchGroups();
      fetchPendingInvitations();
    } catch (error) {
      toast.error('Failed to accept invitation');
      console.error('Error accepting invite:', error);
    }
  };

  const handleDeclineInvite = async (groupId) => {
    try {
      await axios.delete(
        `http://localhost:8080/api/groups/${groupId}/decline?email=${user.email}`,
        { headers: getAuthHeaders() }
      );
      toast.success('Invitation declined');
      fetchPendingInvitations();
    } catch (error) {
      toast.error('Failed to decline invitation');
      console.error('Error declining invite:', error);
    }
  };

  const handleJoinByGroupId = async (e) => {
    e.preventDefault();
    if (!groupIdToJoin.trim()) {
      toast.warning('Please enter a valid group ID');
      return;
    }

    try {
      await axios.post(
        `http://localhost:8080/api/groups/${groupIdToJoin}/join?email=${user.email}`,
        {
          name: user.name || user.email
        },
        { headers: getAuthHeaders() }
      );
      toast.success(`Successfully joined group!`);
      setGroupIdToJoin('');
      fetchGroups();
      setActiveTab('myGroups'); // Switch back to groups tab
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join group');
      console.error('Error joining group by ID:', error);
    }
  };


  const handleRemoveUser = async (groupId, userEmail) => {
    if (!groupId || !userEmail) {
      toast.error('Missing information needed to remove user');
      return;
    }

    try {
      await axios.delete(
        `http://localhost:8080/api/groups/${groupId}/remove?userEmail=${userEmail}`,
        { headers: getAuthHeaders() }
      );
      toast.success('User removed from group');

      if (selectedGroupForDetails && selectedGroupForDetails.id === groupId) {
        setSelectedGroupForDetails(null);
      }

      // Set active tab and navigate back to '/dashboard/groups'
      setActiveTab('myGroups');
      navigate('/dashboard/groups');
    } catch (error) {
      toast.error('Failed to remove user');
      console.error('Error removing user:', error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) {
      return;
    }

    try {
      setLoading(true);

      await axios.delete(
        `http://localhost:8080/api/groups/${groupToDelete.id}`,
        { headers: getAuthHeaders() }
      );
      toast.success('Group deleted successfully');

      if (selectedGroupForDetails && selectedGroupForDetails.id === groupToDelete.id) {
        setSelectedGroupForDetails(null);
      }

      // Close modal and reset group to delete
      setShowDeleteModal(false);
      setGroupToDelete(null);

      fetchGroups();
      setActiveTab('myGroups');
      navigate('/dashboard/groups');
    } catch (error) {
      toast.error('Failed to delete group: ' + (error.response?.data?.message || error.message));
      console.error('Error deleting group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async (groupId) => {
    if (!groupId || !user.email) {
      toast.error('Missing information needed to leave group');
      return;
    }

    try {
      // Send DELETE request to remove the current user from the group
      await axios.delete(
        `http://localhost:8080/api/groups/${groupId}/remove?userEmail=${user.email}`,
        { headers: getAuthHeaders() }
      );
      toast.success('You have left the group');

      // Refresh groups list after successful deletion
      await fetchGroups();

      // Clear group details if currently viewed
      if (selectedGroupForDetails && selectedGroupForDetails.id === groupId) {
        setSelectedGroupForDetails(null);
      }

      // Set active tab and navigate back to '/dashboard/groups'
      setActiveTab('myGroups');
      navigate('/dashboard/groups');
    } catch (error) {
      toast.error('Failed to leave group');
      console.error('Error leaving group:', error);
    }
  };


  // Function to view group details
  const viewGroupDetails = (group) => {
    setSelectedGroupForDetails(group);
    setActiveTab('groupDetails');
  };

  // Render a member with proper name and email extraction
  const renderMember = (member, group, index) => {
    // Try to extract email from different possible structures
    let memberEmail = null;
    if (member.user && member.user.email) {
      memberEmail = member.user.email;
    } else if (member.email) {
      memberEmail = member.email;
    }

    // Try to extract name from different possible structures
    let memberName = 'Unknown User';
    if (member.user && member.user.name) {
      memberName = member.user.name;
    } else if (member.name) {
      memberName = member.name;
    } else if (memberEmail) {
      memberName = memberEmail;
    }

    const isPending = member.accepted === false;
    const isAdmin = group.admin && group.admin.email === user.email;
    const isSelf = memberEmail === user.email;

    return (
      <li
        key={member.id || `member-${index}`}
        className="list-group-item d-flex justify-content-between align-items-center"
      >
        <div>
          <span className="fw-bold">{memberName}</span>
          {memberEmail && memberEmail !== memberName && (
            <span className="text-muted ms-2">({memberEmail})</span>
          )}
          {isPending && (
            <span className="badge bg-warning text-dark ms-2">Pending</span>
          )}
        </div>

        {isAdmin && memberEmail && !isSelf && (
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => handleRemoveUser(group.id, memberEmail)}
          >
            <i className="bi bi-person-x-fill me-1"></i>
            Remove
          </button>
        )}
      </li>
    );
  };

  const renderGroupCard = (group, index) => {
    const isAdmin = group.admin && user.email === group.admin.email;

    // Check if this user is a member of this group
    const userIsMember = Array.isArray(group.members) && group.members.some(
      member => {
        const memberEmail = member.user?.email || member.email;
        return memberEmail === user.email && member.accepted !== false;
      }
    );

    const memberCount = Array.isArray(group.members) ? group.members.length : 0;

    return (
      <div key={group.id || `group-${index}`} className="col-md-6 col-lg-4 mb-4">
        <div className="card h-100 shadow">
          <div className={`card-header ${isAdmin ? 'bg-primary' : userIsMember ? 'bg-success' : 'bg-dark'} text-white d-flex justify-content-between align-items-center`}>
            <h5 className="mb-0">{group.name}</h5>
            <div>
              {isAdmin && (
                <span className="badge bg-info me-2">Admin</span>
              )}
              {userIsMember && !isAdmin && (
                <span className="badge bg-light text-dark me-2">Member</span>
              )}
              <span className="badge bg-light text-dark">ID: {group.id}</span>
            </div>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <h6 className="card-subtitle mb-2 text-muted">Description</h6>
              <p className="card-text">{group.description || 'No description provided'}</p>
            </div>

            <div className="mb-3">
              <h6 className="card-subtitle mb-2 text-muted">Admin</h6>
              <p className="card-text fw-bold">
                {group.admin?.name || group.admin?.email || 'Unknown'}
              </p>
            </div>

            <div className="d-grid gap-2 mt-4">
              <button
                className="btn btn-primary w-100"
                onClick={() => viewGroupDetails(group)}
              >
                <i className="bi bi-info-circle me-1"></i>
                View Details
              </button>

              {userIsMember && !isAdmin && (
                <button
                  className="btn btn-outline-danger w-100 mt-2"
                  onClick={() => handleLeaveGroup(group.id)}
                >
                  <i className="bi bi-box-arrow-right me-1"></i>
                  Leave Group
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container py-4">
      {/* Navigation Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <ul className="nav nav-tabs nav-fill">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'myGroups' ? 'active' : ''}`}
                onClick={() => setActiveTab('myGroups')}
              >
                <i className="bi bi-people-fill me-2"></i>
                My Groups
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => setActiveTab('create')}
              >
                <i className="bi bi-plus-circle-fill me-2"></i>
                Create Group
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'join' ? 'active' : ''}`}
                onClick={() => setActiveTab('join')}
              >
                <i className="bi bi-box-arrow-in-right me-2"></i>
                Join Group
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'invite' ? 'active' : ''}`}
                onClick={() => setActiveTab('invite')}
              >
                <i className="bi bi-envelope-fill me-2"></i>
                Invite User
              </button>
            </li>
            <li className="nav-item position-relative">
              <button
                className={`nav-link ${activeTab === 'invitations' ? 'active' : ''}`}
                onClick={() => setActiveTab('invitations')}
              >
                <i className="bi bi-envelope-check-fill me-2"></i>
                Invitations
                {pendingInvitations.length > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {pendingInvitations.length}
                  </span>
                )}
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Tab Content */}
      <div className="row">
        <div className="col-12">
          {/* My Groups Tab */}
          {activeTab === 'myGroups' && (
            <div>
              <h2 className="mb-4">
                <i className="bi bi-people-fill me-2"></i>
                My Groups
              </h2>

              {loading ? (
                <div className="d-flex justify-content-center p-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : !Array.isArray(groups) || groups.length === 0 ? (
                <div className="text-center py-5">
                  <div className="display-1 text-muted mb-4">
                    <i className="bi bi-people"></i>
                  </div>
                  <h3 className="text-muted mb-4">No Groups Found</h3>
                  <p className="text-muted mb-4">You don't have any groups yet. Create a new group or join an existing one.</p>
                  <div className="d-flex justify-content-center gap-3">
                    <button
                      className="btn btn-primary"
                      onClick={() => setActiveTab('create')}
                    >
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Group
                    </button>
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => setActiveTab('join')}
                    >
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Join Group
                    </button>
                  </div>
                </div>
              ) : (
                <div className="row">
                  {groups.map((group, index) => renderGroupCard(group, index))}
                </div>
              )}
            </div>
          )}

          {/* Group Details Tab */}
          {activeTab === 'groupDetails' && selectedGroupForDetails && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>
                  <i className="bi bi-info-circle me-2"></i>
                  Group Details
                </h2>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setActiveTab('myGroups');
                    setSelectedGroupForDetails(null);
                  }}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to Groups
                </button>
              </div>

              <div className="card shadow mb-4">
                <div className={`card-header ${selectedGroupForDetails.admin && selectedGroupForDetails.admin.email === user.email
                  ? 'bg-primary'
                  : 'bg-dark'
                  } text-white`}>
                  <div className="d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">{selectedGroupForDetails.name}</h4>
                    <div>
                      {selectedGroupForDetails.admin && selectedGroupForDetails.admin.email === user.email ? (
                        <span className="badge bg-info">Admin</span>
                      ) : (
                        <span className="badge bg-light text-dark">Member</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="card-body p-4">
                  <div className="row">
                    <div className="col-md-6 mb-4">
                      <h5 className="card-title mb-3">Group Information</h5>

                      <div className="mb-3">
                        <p className="text-muted mb-1">Group ID:</p>
                        <p className="fw-bold">{selectedGroupForDetails.id}</p>
                      </div>

                      <div className="mb-3">
                        <p className="text-muted mb-1">Description:</p>
                        <p>{selectedGroupForDetails.description || 'No description provided'}</p>
                      </div>

                      <div className="mb-3">
                        <p className="text-muted mb-1">Admin:</p>
                        <p className="fw-bold">
                          {selectedGroupForDetails.admin?.name || selectedGroupForDetails.admin?.email || 'Unknown'}
                        </p>
                      </div>
                      <div className="mb-3">
                        <p className="text-muted mb-1">Created At:</p>
                        <p>{selectedGroupForDetails.createdAt
                          ? new Date(selectedGroupForDetails.createdAt).toLocaleString()
                          : 'Unknown'}</p>
                      </div>


                      {/* Group actions */}
                      {/* Group actions */}
                      <div className="mt-4">
                        {selectedGroupForDetails.admin && selectedGroupForDetails.admin.email === user.email ? (
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-primary"
                              onClick={() => {
                                setSelectedGroup(selectedGroupForDetails);
                                setActiveTab('invite');
                              }}
                            >
                              <i className="bi bi-person-plus-fill me-2"></i>
                              Invite Members
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => confirmDeleteGroup(selectedGroupForDetails)}
                            >
                              <i className="bi bi-trash-fill me-2"></i>
                              Delete Group
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleLeaveGroup(selectedGroupForDetails.id)}
                          >
                            <i className="bi bi-box-arrow-right me-2"></i>
                            Leave Group
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <h5 className="card-title mb-3">Members ({selectedGroupForDetails.members?.length || 0})</h5>

                      <div className="card">
                        <div className="card-body p-0">
                          <ul className="list-group list-group-flush">
                            {Array.isArray(selectedGroupForDetails.members) && selectedGroupForDetails.members.length > 0 ? (
                              selectedGroupForDetails.members.map((member, index) => (
                                renderMember(member, selectedGroupForDetails, index)
                              ))
                            ) : (
                              <li className="list-group-item text-center text-muted">No members yet</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create Group Tab */}
          {activeTab === 'create' && (
            <div>
              <h2 className="mb-4">
                <i className="bi bi-plus-circle-fill me-2"></i>
                Create New Group
              </h2>

              <div className="card shadow">
                <div className="card-body p-4">
                  <form onSubmit={handleCreateGroup}>
                    <div className="mb-4">
                      <label htmlFor="groupName" className="form-label fw-bold">Group Name</label>
                      <input
                        type="text"
                        className="form-control form-control-lg"
                        id="groupName"
                        placeholder="Enter group name"
                        value={newGroup.name}
                        onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="groupDescription" className="form-label fw-bold">Description</label>
                      <textarea
                        className="form-control"
                        id="groupDescription"
                        rows="4"
                        placeholder="Describe the purpose of this group"
                        value={newGroup.description}
                        onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                      ></textarea>
                    </div>
                    <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setActiveTab('myGroups')}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        <i className="bi bi-plus-circle me-2"></i>
                        Create Group
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Join Group Tab */}
          {activeTab === 'join' && (
            <div>
              <h2 className="mb-4">
                <i className="bi bi-box-arrow-in-right me-2"></i>
                Join Group
              </h2>

              <div className="card shadow">
                <div className="card-body p-4">
                  <form onSubmit={handleJoinByGroupId}>
                    <div className="mb-4">
                      <label htmlFor="groupIdToJoin" className="form-label fw-bold">Group ID</label>
                      <input
                        type="text"
                        className="form-control form-control-lg"
                        id="groupIdToJoin"
                        placeholder="Enter the group ID"
                        value={groupIdToJoin}
                        onChange={(e) => setGroupIdToJoin(e.target.value)}
                        required
                      />
                      <div className="form-text">
                        You need the exact Group ID to join. Ask the group admin for this information.
                      </div>
                    </div>
                    <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setActiveTab('myGroups')}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        Join Group
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Invite User Tab */}
          {activeTab === 'invite' && (
            <div>
              <h2 className="mb-4">
                <i className="bi bi-envelope-fill me-2"></i>
                Invite User to Group
              </h2>

              <div className="card shadow">
                <div className="card-body p-4">
                  <form onSubmit={handleInviteUser}>
                    <div className="mb-4">
                      <label htmlFor="selectGroup" className="form-label fw-bold">Select Group</label>
                      <select
                        className="form-select form-select-lg"
                        id="selectGroup"
                        value={selectedGroup?.id || ''}
                        onChange={(e) => {
                          const groupId = parseInt(e.target.value);
                          const selected = groups.find(group => group.id === groupId) || null;
                          setSelectedGroup(selected);
                        }}
                        required
                      >
                        <option value="">Choose a group</option>
                        {Array.isArray(groups) && groups.filter(group =>
                          group.admin && group.admin.email === user.email
                        ).map(group => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                      {(!Array.isArray(groups) || !groups.some(g => g.admin && g.admin.email === user.email)) && (
                        <div className="alert alert-warning mt-3">
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          You don't have any groups where you're the admin. You can only invite users to groups you administer.
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <label htmlFor="inviteEmail" className="form-label fw-bold">Email Address</label>
                      <input
                        type="email"
                        className="form-control form-control-lg"
                        id="inviteEmail"
                        placeholder="Enter user's email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setActiveTab('myGroups')}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!selectedGroup || inviteSending}
                      >
                        {inviteSending ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Sending...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-envelope me-2"></i>
                            Send Invitation
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Pending Invitations Tab */}
          {activeTab === 'invitations' && (
            <div>
              <h2 className="mb-4">
                <i className="bi bi-envelope-check-fill me-2"></i>
                Pending Invitations
              </h2>

              {loading ? (
                <div className="d-flex justify-content-center p-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : pendingInvitations.length === 0 ? (
                <div className="text-center py-5">
                  <div className="display-1 text-muted mb-4">
                    <i className="bi bi-envelope-open"></i>
                  </div>
                  <h3 className="text-muted mb-4">No Pending Invitations</h3>
                  <p className="text-muted">You don't have any pending group invitations.</p>
                </div>
              ) : (
                <div className="row">
                  {pendingInvitations.map((invitation, index) => (
                    <div key={`invitation-${index}`} className="col-md-6 col-lg-4 mb-4">
                      <div className="card h-100 shadow">
                        <div className="card-header bg-warning">
                          <h5 className="mb-0">Invitation to Join</h5>
                        </div>
                        <div className="card-body">
                          <h5 className="card-title">{invitation?.name || 'Unknown Group'}</h5>
                          <p className="card-text">
                            {invitation?.description || 'No description available'}
                          </p>
                          <p className="text-muted mb-1">Group ID: {invitation?.id || 'Unknown'}</p>
                          <p className="text-muted">
                            Admin: {invitation?.admin?.name || invitation?.admin?.email || 'Unknown'}
                          </p>

                          <div className="d-flex gap-2 mt-4">
                            <button
                              className="btn btn-success flex-grow-1"
                              onClick={() => handleAcceptInvite(invitation?.id)}
                            >
                              <i className="bi bi-check-circle me-2"></i>
                              Accept
                            </button>
                            <button
                              className="btn btn-outline-danger flex-grow-1"
                              onClick={() => handleDeclineInvite(invitation?.id)}
                            >
                              <i className="bi bi-x-circle me-2"></i>
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  Delete Group
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-4">You are about to permanently delete the group:</p>
                <div className="alert alert-warning">
                  <strong>{groupToDelete?.name}</strong>
                </div>
                <p>This will remove all members and all data associated with this group. This action <strong>cannot</strong> be undone.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteGroup}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash-fill me-2"></i>
                      Delete Group
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;