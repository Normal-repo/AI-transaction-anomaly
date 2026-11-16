import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { CustomerDetails } from './pages/CustomerDetails';
import { Transactions } from './pages/Transactions';
import { Investigations } from './pages/Investigations';
import { Notifications } from './pages/Notifications';
import { AuditTrail } from './pages/AuditTrail';
import { About } from './pages/About';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-950 text-slate-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:clientId" element={<CustomerDetails />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/investigations" element={<Investigations />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/audit" element={<AuditTrail />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
