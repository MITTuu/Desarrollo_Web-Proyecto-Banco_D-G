const DATA_PATH = '../assets/data/users.json';

export async function getUsers() {
  const response = await fetch(DATA_PATH);
  if (!response.ok) throw new Error('No se pudo cargar users.json');
  const users = await response.json();
  return users;
}

export async function getUserByName(username) {
  const users = await getUsers();
  return users.find(user => user.username === username) || null;
}
