// The Django property serializer may represent the seller as an ID or object.
export function isPropertyOwner(property, user) {
  if (!property || !user) return false

  const seller = property.seller_id ?? property.seller
  if (seller == null) return false

  if (typeof seller === 'object') {
    if (seller.id != null && user.id != null) return String(seller.id) === String(user.id)
    return Boolean(seller.username && seller.username === user.username)
  }

  if (user.id != null && String(seller) === String(user.id)) return true
  return typeof seller === 'string' && seller === user.username
}
