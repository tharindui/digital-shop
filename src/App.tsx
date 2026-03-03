import { useMemo, useState } from 'react';
import CameraView from './components/CameraView';
import DressCatalog from './components/DressCatalog';
import { DRESSES } from './lib/dresses';
import type { SizeOption } from './types';

function App() {
  const [selectedDressId, setSelectedDressId] = useState(DRESSES[0].id);
  const [selectedSize, setSelectedSize] = useState<SizeOption>('M');
  const [debug, setDebug] = useState(false);

  const selectedDress = useMemo(
    () => DRESSES.find((dress) => dress.id === selectedDressId) ?? DRESSES[0],
    [selectedDressId],
  );

  return (
    <main className="app">
      <DressCatalog
        dresses={DRESSES}
        selectedDressId={selectedDressId}
        selectedSize={selectedSize}
        debug={debug}
        onDressSelect={setSelectedDressId}
        onSizeSelect={setSelectedSize}
        onDebugToggle={setDebug}
      />
      <CameraView selectedDress={selectedDress} selectedSize={selectedSize} debug={debug} />
    </main>
  );
}

export default App;
