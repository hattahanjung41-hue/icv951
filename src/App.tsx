import { Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Guest } from './pages/Guest';
import { Memories } from './pages/Memories';
import { MemoryDetail } from './pages/MemoryDetail';
import { Live } from './pages/Live';
import { Admin } from './pages/Admin';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/guest" element={<Guest />} />
      <Route path="/memories" element={<Memories />} />
      <Route path="/memories/:id" element={<MemoryDetail />} />
      <Route path="/live" element={<Live />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
