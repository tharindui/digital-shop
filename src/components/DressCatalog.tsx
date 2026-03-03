import type { DressItem, SizeOption } from '../types';

interface Props {
  dresses: DressItem[];
  selectedDressId: string;
  selectedSize: SizeOption;
  debug: boolean;
  onDressSelect: (id: string) => void;
  onSizeSelect: (size: SizeOption) => void;
  onDebugToggle: (enabled: boolean) => void;
}

export default function DressCatalog({
  dresses,
  selectedDressId,
  selectedSize,
  debug,
  onDressSelect,
  onSizeSelect,
  onDebugToggle,
}: Props) {
  return (
    <aside className="catalog">
      <h2>Dress Catalog</h2>
      <div className="dress-list">
        {dresses.map((dress) => (
          <button
            key={dress.id}
            className={`dress-card ${selectedDressId === dress.id ? 'active' : ''}`}
            onClick={() => onDressSelect(dress.id)}
            type="button"
          >
            <img src={dress.filePath} alt={dress.name} />
            <span>{dress.name}</span>
          </button>
        ))}
      </div>

      <label className="control-row">
        Size
        <select
          value={selectedSize}
          onChange={(event) => onSizeSelect(event.target.value as SizeOption)}
        >
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
        </select>
      </label>

      <label className="control-row checkbox-row">
        <input
          type="checkbox"
          checked={debug}
          onChange={(event) => onDebugToggle(event.target.checked)}
        />
        Debug
      </label>
    </aside>
  );
}
