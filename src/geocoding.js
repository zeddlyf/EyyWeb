export async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`
    const res = await fetch(url, { headers: { 'User-Agent': 'EyyWeb/1.0 (+eyytrike)' } })
    const data = await res.json()
    if (data?.display_name) return data.display_name
    const a = data?.address || {}
    const parts = [a.house_number, a.road, a.neighbourhood, a.suburb, a.city || a.town || a.village, a.state, a.postcode, a.country].filter(Boolean)
    return parts.join(', ') || `${lat.toFixed(5)}, ${lon.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`
  }
}

export function toHumanAddress(addr, lat, lon) {
  if (addr && addr.trim().length > 0) return addr
  if (typeof lat === 'number' && typeof lon === 'number') return `${lat.toFixed(5)}, ${lon.toFixed(5)}`
  return 'Unknown location'
}

