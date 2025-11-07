import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import Liabilities from "./pages/Liabilities";
import Transactions from "./pages/Transactions";
import ExcelImport from './pages/ExcelImportExport';
import Categories from "./pages/Categories";
import CategoryDetail from "./pages/CategoryDetail";
import AssetDetail from "./pages/AssetDetail";
import LiabilityDetail from "./pages/LiabilityDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assets"
              element={
                <ProtectedRoute>
                  <Assets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/liabilities"
              element={
                <ProtectedRoute>
                  <Liabilities />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/excel-import-export"
              element={
                <ProtectedRoute>
                  <ExcelImport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/categories"
              element={
                <ProtectedRoute>
                  <Categories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/categories/:categoryId"
              element={
                <ProtectedRoute>
                  <CategoryDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assets/:assetId"
              element={
                <ProtectedRoute>
                  <AssetDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/liabilities/:liabilityId"
              element={
                <ProtectedRoute>
                  <LiabilityDetail />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
