# Multiplayer Snake Game

This is a simple multiplayer implementation of the classic Snake game using Socket.io for real-time communication and HTML Canvas for rendering.

## Features

- Real-time multiplayer gameplay
- Room-based system (join existing games or create new ones)
- Colorful snakes with player identification
- Score tracking
- Collision detection
- Responsive controls

## How to Play

1. Enter a room code (or use the default one)
2. Use arrow keys to control your snake
3. Eat the red food to grow and earn points
4. Avoid collisions with other snakes and yourself
5. Your snake will have a white outline to help you identify it

## Project Structure

- `server.js` - Node.js server using Express and Socket.io
- `public/index.html` - Client-side game with HTML, CSS, and JavaScript

## Technical Implementation

### Server-Side
- Manages game state (snake positions, food placement)
- Handles player connections/disconnections
- Processes player inputs (direction changes)
- Runs the game loop for each room
- Broadcasts state updates to all connected clients

### Client-Side
- Renders the game using HTML Canvas
- Handles user input
- Displays scores and player count
- Communicates with the server via Socket.io

## How to Run

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

4. To play with friends, they can join the same room by entering the same room code

## Future Improvements

- Add power-ups
- Implement different game modes
- Add customization options (snake appearance, speed)
- Add mobile support with touch controls
- Implement a leaderboard system

Feel free to modify and extend this project as you like!
