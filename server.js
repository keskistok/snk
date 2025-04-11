// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

// Game constants
const GRID_SIZE = 20;
const GAME_SPEED = 100; // ms
const INITIAL_SNAKE_LENGTH = 3;

// Games storage
const games = {};

// Food types with their colors and point values
const FOOD_TYPES = [
  { color: '#ff0000', points: -10, name: 'Rotten Apple' },  // Red (negative points)
  { color: '#00ff00', points: 10, name: 'Green Apple' },    // Green (small points)
  { color: '#0000ff', points: 20, name: 'Blueberry' },      // Blue (medium points)
  { color: '#ffff00', points: 30, name: 'Banana' },         // Yellow (large points)
  { color: '#ff00ff', points: 50, name: 'Dragon Fruit' }    // Purple (huge points)
];

// Generate random position on the grid
function generateRandomPosition() {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE)
  };
}

// Generate random food type
function getRandomFoodType() {
  return FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
}

// Check if position is occupied by any snake
function isPositionOccupied(position, snakes) {
  for (const playerId in snakes) {
    for (const segment of snakes[playerId].snake) {
      if (segment.x === position.x && segment.y === position.y) {
        return true;
      }
    }
  }
  return false;
}

// Generate a position for food that doesn't overlap with any snake or existing food
function generateFood(gameId) {
  const position = generateRandomPosition();
  
  // Only check for collisions if we have players
  if (games[gameId] && games[gameId].players && Object.keys(games[gameId].players).length > 0) {
    if (isPositionOccupied(position, games[gameId].players)) {
      return generateFood(gameId); // Try again if position is occupied
    }
    
    // Check if position conflicts with any existing food
    if (games[gameId].foodItems) {
      for (const food of games[gameId].foodItems) {
        if (food.x === position.x && food.y === position.y) {
          return generateFood(gameId); // Try again if position conflicts with existing food
        }
      }
    }
  }
  
  // Create a new food item with position and random type
  const foodType = getRandomFoodType();
  return {
    x: position.x,
    y: position.y,
    color: foodType.color,
    points: foodType.points,
    name: foodType.name
  };
}

// Create a new snake for a player
function createSnake() {
  const startX = Math.floor(Math.random() * (GRID_SIZE - INITIAL_SNAKE_LENGTH));
  const startY = Math.floor(Math.random() * GRID_SIZE);
  
  const snake = [];
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    snake.push({ x: startX + i, y: startY });
  }
  
  return snake;
}

// Create a new player
function createPlayer(username) {
  return {
    snake: createSnake(),
    direction: 'left',
    score: 0,
    color: `#${Math.floor(Math.random() * 16777215).toString(16).padEnd(6, '0')}`,
    username: username || `Player_${Math.floor(Math.random() * 1000)}`
  };
}

// Create a new game room
function createGameRoom(gameId) {
  games[gameId] = {
    players: {},
    foodItems: [generateFood(gameId), generateFood(gameId), generateFood(gameId)], // Start with 3 food items
    active: false,
    maxFood: 5 // Maximum number of food items in game at once
  };
  return games[gameId];
}

// Main game loop
function updateGame(gameId) {
  const game = games[gameId];
  if (!game || !game.active) return;

  // Process each player's move
  for (const playerId in game.players) {
    const player = game.players[playerId];
    const snake = player.snake;
    
    if (snake.length === 0) continue; // Skip if snake is empty
    
    // Clone the head for the new position
    const head = { ...snake[0] };
    
    // Move the head based on direction
    switch (player.direction) {
      case 'up': head.y = (head.y - 1 + GRID_SIZE) % GRID_SIZE; break;
      case 'down': head.y = (head.y + 1) % GRID_SIZE; break;
      case 'left': head.x = (head.x - 1 + GRID_SIZE) % GRID_SIZE; break;
      case 'right': head.x = (head.x + 1) % GRID_SIZE; break;
    }
    
    // Check if snake eats any food
    let foodEaten = false;
    for (let i = 0; i < game.foodItems.length; i++) {
      const food = game.foodItems[i];
      if (head.x === food.x && head.y === food.y) {
        // Add new head (grow)
        snake.unshift(head);
        
        // Adjust score based on food type
        player.score += food.points;
        
        // Replace the eaten food with a new one
        game.foodItems[i] = generateFood(gameId);
        
        // Occasionally add another food item if below max
        if (game.foodItems.length < game.maxFood && Math.random() < 0.3) {
          game.foodItems.push(generateFood(gameId));
        }
        
        foodEaten = true;
        break;
      }
    }
    
    if (!foodEaten) {
      // Regular move (add head, remove tail)
      snake.unshift(head);
      snake.pop();
    }
    
    // Check for collisions with other snakes (including self)
    let collision = false;
    
    // Loop through all players (including self for self-collision)
    for (const otherPlayerId in game.players) {
      const otherSnake = game.players[otherPlayerId].snake;
      
      // Start index: if checking against self, start from segment 1 (skip head)
      // If checking against other snakes, check all segments
      const startIndex = (playerId === otherPlayerId) ? 1 : 0;
      
      for (let i = startIndex; i < otherSnake.length; i++) {
        if (head.x === otherSnake[i].x && head.y === otherSnake[i].y) {
          collision = true;
          break;
        }
      }
      
      if (collision) break;
    }
    
    // Reset player if collision detected
    if (collision) {
      const username = game.players[playerId].username;
      game.players[playerId] = createPlayer(username);
    }
  }
  
  // Send updated game state to all players
  sendGameState(gameId);
}

// Send game state to all clients in a room
function sendGameState(gameId) {
  const game = games[gameId];
  if (!game) return;
  
  // Create a clean copy of game data without circular references
  const gameState = {
    foodItems: [...game.foodItems], // All food items with their properties
    foodTypes: FOOD_TYPES, // Send food type information for the legend
    players: {}
  };
  
  // Copy player data
  for (const playerId in game.players) {
    gameState.players[playerId] = {
      snake: [...game.players[playerId].snake], // Create copy of snake array
      score: game.players[playerId].score,
      color: game.players[playerId].color,
      username: game.players[playerId].username
    };
  }
  
  // Send to all clients in the room
  io.to(gameId).emit('gameState', gameState);
}

// Socket connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Player joining a game
  socket.on('joinGame', ({ gameId, username }) => {
    // Join the socket room
    socket.join(gameId);
    
    // Create game if it doesn't exist
    if (!games[gameId]) {
      createGameRoom(gameId);
    }
    
    // Add player to game
    games[gameId].players[socket.id] = createPlayer(username);
    
    // Store gameId on socket for later reference
    socket.gameId = gameId;
    
    // Start game loop if not already running
    if (!games[gameId].active) {
      games[gameId].active = true;
      games[gameId].interval = setInterval(() => updateGame(gameId), GAME_SPEED);
    }
    
    // Send initial game state to the new player
    sendGameState(gameId);
    
    // Notify all clients about the player count
    io.to(gameId).emit('playerJoined', {
      playerId: socket.id,
      players: Object.keys(games[gameId].players).length
    });
  });
  
  // Player changes direction
  socket.on('changeDirection', (direction) => {
    const gameId = socket.gameId;
    if (!gameId || !games[gameId] || !games[gameId].players[socket.id]) return;
    
    const player = games[gameId].players[socket.id];
    const currentDir = player.direction;
    
    // Prevent 180-degree turns (can't go directly opposite)
    if ((currentDir === 'up' && direction === 'down') ||
        (currentDir === 'down' && direction === 'up') ||
        (currentDir === 'left' && direction === 'right') ||
        (currentDir === 'right' && direction === 'left')) {
      return;
    }
    
    player.direction = direction;
  });
  
  // Player disconnects
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const gameId = socket.gameId;
    if (!gameId || !games[gameId]) return;
    
    // Remove player from game
    if (games[gameId].players[socket.id]) {
      delete games[gameId].players[socket.id];
      
      // Check if game is now empty
      if (Object.keys(games[gameId].players).length === 0) {
        // Stop the game loop and clean up
        clearInterval(games[gameId].interval);
        delete games[gameId];
      } else {
        // Notify remaining players
        io.to(gameId).emit('playerLeft', {
          playerId: socket.id,
          players: Object.keys(games[gameId].players).length
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});