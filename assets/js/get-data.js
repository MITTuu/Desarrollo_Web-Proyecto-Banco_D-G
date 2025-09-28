const USER_DATA_PATH = '../assets/data/users.json';
const ACCOUNT_DATA_PATH = '../assets/data/accounts.json';

export async function getUsers() {
  const response = await fetch(USER_DATA_PATH);
  if (!response.ok) throw new Error('No se pudo cargar users.json');
  const users = await response.json();
  return users;
}

export async function getUserByName(username) {
  const users = await getUsers();
  return users.find(user => user.username === username) || null;
}

export async function getAccounts() {
  const response = await fetch(ACCOUNT_DATA_PATH);
  if (!response.ok) throw new Error('No se pudo cargar accounts.json');
  const accounts = await response.json();
  return accounts;
}