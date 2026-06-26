import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/pageNotFount';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import AppLayout from './components/AppLayout';
import Home from './pages/home';
import Login from './pages/login';
import Anniversary from './pages/Anniversary';
import Mood from './pages/mood';
import AdminLogin from './pages/adminLogin';
import Admin from './pages/admin';

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/anniversary" element={<Anniversary />} />
            <Route path="/mood" element={<Mood />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App
