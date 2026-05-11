// NotificationsPage.jsx
import React, { useState } from 'react';
import { FiBell, FiCheckCircle, FiClock, FiEye } from 'react-icons/fi';

// --- Sample Data for Notifications (mimicking the screenshot) ---
const initialNotifications = [
  { id: 1, type: 'New Order Received', details: 'New order #ORD1763008412200 received from Dashrath yadav for ₹250.00', orderId: 'ORD1763008412200', priority: 'High', date: '13 Nov 2025, 10:03 am', unread: true },
  { id: 2, type: 'New Order Received', details: 'New order #ORD1762935108734 received from Dashrath yadav for ₹78,000.00', orderId: 'ORD1762935108734', priority: 'High', date: '12 Nov 2025, 01:41 pm', unread: true },
  { id: 3, type: 'New Order Received', details: 'New order #ORD1762635153196 received from Dashrath yadav for ₹3,530.00', orderId: 'ORD1762635153196', priority: 'High', date: '12 Nov 2025, 12:35 pm', unread: true },
  { id: 4, type: 'New Order Received', details: 'New order #ORD1762035108735 received from Dashrath yadav for ₹450.00', orderId: 'ORD1762035108735', priority: 'High', date: '10 Nov 2025, 06:02 pm', unread: true },
  { id: 5, type: 'New Order Received', details: 'New order #ORD1762776717598 received from Parmesh for ₹450.00', orderId: 'ORD1762776717598', priority: 'High', date: '10 Nov 2025, 05:41 pm', unread: true },
  { id: 6, type: 'System Alert', details: 'Storage usage has reached 90% capacity.', orderId: null, priority: 'Medium', date: '09 Nov 2025, 08:00 am', unread: false },
];

const getPriorityClasses = (priority) => {
  switch (priority) {
    case 'High':
      return 'bg-red-500 text-white';
    case 'Medium':
      return 'bg-orange-500 text-white';
    default:
      return 'bg-gray-400 text-white';
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter(n => n.unread).length;

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const handleViewDetails = (id) => {
    // In a real app, this would navigate to the order details page
    alert(`Navigating to details for notification ID: ${id}`);
    setNotifications(notifications.map(n => (n.id === id ? { ...n, unread: false } : n)));
  };

  const NotificationItem = ({ notif }) => (
    <div 
      className={`p-4 rounded-lg border mb-3 transition-colors ${
        notif.unread ? 'bg-white border-blue-200 shadow-md' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-3">
          <FiBell className={`w-5 h-5 mt-1 ${notif.unread ? 'text-blue-600' : 'text-gray-400'}`} />
          <div>
            <h4 className="text-md font-semibold text-gray-800">{notif.type}</h4>
            <p className="text-sm text-gray-600 mt-1">{notif.details}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 flex items-center">
            <FiClock className="w-3 h-3 mr-1" />
            {notif.date}
          </p>
          {notif.unread && <span className="text-xs text-blue-500 font-medium">NEW</span>}
        </div>
      </div>
      
      <div className="flex items-center space-x-3 mt-3 pt-3 border-t border-gray-100">
        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${getPriorityClasses(notif.priority)}`}>
          {notif.priority} Priority
        </span>
        <button 
          onClick={() => handleViewDetails(notif.id)}
          className="flex items-center text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors"
        >
          <FiEye className="w-3 h-3 mr-1" /> View Details
        </button>
        {notif.orderId && (
            <span className="text-xs text-gray-400 ml-4">
                Order: {notif.orderId}
            </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="notifications-container bg-white rounded-lg shadow-xl p-6">

        {/* Header and Mark All Read Button */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <FiBell className="w-5 h-5 mr-2 text-red-600" /> Notifications <span className="ml-2 px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-600">{unreadCount} unread</span>
          </h2>
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 text-sm font-semibold bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors shadow-sm flex items-center"
            disabled={unreadCount === 0}
          >
            <FiCheckCircle className="w-4 h-4 mr-2" />
            Mark All Read
          </button>
        </div>

        {/* Notifications List */}
        <div className="mt-4">
          {notifications.length > 0 ? (
            notifications.map(notif => <NotificationItem key={notif.id} notif={notif} />)
          ) : (
            <div className="p-8 text-center text-gray-500 border border-dashed rounded-lg">
              You have no notifications.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}