// FilesManagementPage.jsx

import React, { useState } from 'react';
// 🛑 IMPORTANT: Update these import paths to match your project structure
import FileDashboard from './FilesPage.jsx'; // Assuming this is your multi-user list
import UserDetailsView from './UserDetailsView.jsx'; // Assuming this is your single-user detail component

export default function FilesManagementPage() {
    // State to hold the UID of the user whose details we want to view
    const [selectedUserId, setSelectedUserId] = useState(null);

    // Function to navigate to the details view
    const handleSelectUser = (userId) => {
        setSelectedUserId(userId);
    };

    // Function to navigate back to the dashboard
    const handleBackToDashboard = () => {
        setSelectedUserId(null);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
            {selectedUserId ? (
                // Renders the detailed view
                <UserDetailsView 
                    userIdToView={selectedUserId} 
                    onBack={handleBackToDashboard}
                />
            ) : (
                // Renders the main dashboard/all files list
                <FileDashboard 
                    onSelectUser={handleSelectUser} 
                />
            )}
        </div>
    );
}