// Keep matching independent of the DOM so long archives only read their text once.
export function filterUpdates(updates, { role = 'all', year = 'all', query = '' } = {}) {
  const needle = query.trim().toLocaleLowerCase('ru');
  return updates.filter((update) =>
    (role === 'all' || update.role === role) &&
    (year === 'all' || update.year === year) &&
    update.text.toLocaleLowerCase('ru').includes(needle)
  );
}
