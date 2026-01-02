# Monvera - Monster Catching Game

## Setup Instructions

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Database Setup**
    - Make sure you have MySQL running (e.g., via XAMPP).
    - Create a new database named `db_monvera` or run the provided SQL script.
    - Import `database.sql` into your MySQL database to create the necessary tables.
    - Copy `.env.example` to `.env` and update your database credentials if they differ from the defaults.

3.  **Run the Server**
    ```bash
    npm start
    ```

4.  **Access the Game**
    - Game: [http://localhost:3000](http://localhost:3000)
    - Admin Panel: [http://localhost:3000/admin/index.html](http://localhost:3000/admin/index.html)

## Project Structure
- `server.js`: Main entry point.
- `public/`: Frontend files (Game & Admin).
- `src/`: Backend logic (Controllers, Routes, Config).
- `database.sql`: Database schema.
