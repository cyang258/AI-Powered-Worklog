import type { IpcMainEvent } from "electron";
import { UserDB } from "./database/user.js";

// --------------------
// User API
// --------------------
export async function getAllUsers() {
try {
    const users = UserDB.getAllUser(); // sync function
    return { success: true, content: users };
  } catch (err: any) {
    console.error(err);
    return { success: false, content: err.message };
  }
}

export async function addUser(
  name: string,
  email: string,
  age: number
) {
  try {
    UserDB.insertUser(name, email, age);
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { success: false, content: err.message };
  }
}

// --------------------
// Add more table APIs similarly
// --------------------
