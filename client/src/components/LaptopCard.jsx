export default function LaptopCard({ laptop, selected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(laptop.id)}
      className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
        selected ? 'border-black shadow-lg' : 'border-gray-200 hover:border-gray-400'
      }`}
    >
      {laptop.image_url ? (
        <img
          src={laptop.image_url}
          alt={laptop.name}
          className="w-full h-40 object-cover rounded-lg mb-3"
        />
      ) : (
        <div className="w-full h-40 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-400">
          No image
        </div>
      )}
      <h3 className="font-semibold text-sm">{laptop.name}</h3>
      <p className="text-xs text-gray-500 mt-1">{laptop.brand} {laptop.model}</p>
      {laptop.specs && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{laptop.specs}</p>}
      <p className="font-bold mt-2">${parseFloat(laptop.price_cad).toFixed(2)}</p>
    </div>
  );
}
