import AdminView from './AdminView.jsx';
import PlayerView from './PlayerView.jsx';
import SoloView from './SoloView.jsx';

// /admin → écran du stand · /solo → partie individuelle sans serveur · sinon → vue joueur mobile.
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '');
  const View = path === '/admin' ? AdminView : path === '/solo' ? SoloView : PlayerView;
  return (
    <div className="bg-african">
      <View />
    </div>
  );
}
