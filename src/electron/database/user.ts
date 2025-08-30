import { getDB } from './db.js';

const getAllUser = () => {
    try {
        const query = `SELECT * FROM users`
        const readQuery = getDB().prepare(query)
        const rowList = readQuery.all()
        return rowList
    } catch (err) {
        console.error(err)
        throw err
    }
}

const insertUser = (name:string, email:string, age:Number) => {
    try {
        const db = getDB();
        const insertQuery = db.prepare(
            `INSERT INTO users (name, age, email) VALUES ('${name}' , ${age}, '${email}')`
        )

        const transaction = db.transaction(() => {
            insertQuery.run()
        })
        transaction()
    } catch (err) {
        console.error(err)
        throw err
    }
}

export const UserDB = {
    getAllUser,
    insertUser,
}