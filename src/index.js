class NumberGame {
    constructor() {
        this.size = 7;
        this.innerSize = 5;
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(null));
        this.level = 1;
        this.currentNumber = 1;
        this.moveHistory = [];
        this.players = new Set(JSON.parse(localStorage.getItem('players') || '[]'));
        this.currentPlayer = null;
        this.mode = 'player';
        this.gameState = null;
        this.computerMoveInProgress = false;
        this.isPaused = false;
        this.currentTurn = 'player';
        this.rulesURL = 'https://usflearn.instructure.com/courses/1891504/pages/project-topic-1-star-updated-after-class-of-sep-04-with-a-correction-made-on-the-last-figure-of-level-3-section?module_item_id=37312167';

        this.initializeDOM();
        this.attachEventListeners();
        this.updatePlayersList();
        this.updateLevel();
    }

    initializeDOM() {
        this.gridElement = document.getElementById('grid');
        this.messageElement = document.getElementById('message');
        this.levelElement = document.getElementById('level');
        this.playerSelect = document.getElementById('player');
        this.modeSelect = document.getElementById('mode');
        this.startButton = document.getElementById('start');
        this.undoButton = document.getElementById('undo');
        this.undoButton.disabled = true;
        
        // Add rules button
        this.rulesButton = document.createElement('button');
        this.rulesButton.id = 'rulesButton';
        this.rulesButton.textContent = 'Rules';
        this.rulesButton.className = 'game-button';
        // Insert rules button as first button
        this.startButton.parentNode.insertBefore(this.rulesButton, this.startButton);
        
        // Add toggle pause button
        this.togglePauseButton = document.createElement('button');
        this.togglePauseButton.id = 'togglePause';
        this.togglePauseButton.textContent = 'Pause';
        this.togglePauseButton.className = 'game-button';
        this.startButton.parentNode.insertBefore(this.togglePauseButton, this.undoButton);
        
        // Add remove player button
        this.removePlayerButton = document.createElement('button');
        this.removePlayerButton.id = 'removePlayer';
        this.removePlayerButton.textContent = 'Remove Player';
        this.removePlayerButton.className = 'game-button';
        this.removePlayerButton.disabled = true;
        this.playerSelect.parentNode.insertBefore(this.removePlayerButton, this.playerSelect.nextSibling);

        this.createGrid();
    }


    updateLevel() {
        // Update both the level element and make sure instructions are current
        this.levelElement.textContent = this.level;
        this.updateInstructions();
    }

    createGrid() {
        this.gridElement.innerHTML = '';
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                if (i >= 1 && i <= 5 && j >= 1 && j <= 5) {
                    cell.classList.add('inner');
                } else {
                    cell.classList.add('outer');
                    if ((i === 0 || i === 6) && (j === 0 || j === 6)) {
                        cell.classList.add('diagonal');
                    }
                }
                
                cell.dataset.row = i;
                cell.dataset.col = j;
                cell.addEventListener('click', () => this.handleCellClick(i, j));
                this.gridElement.appendChild(cell);
            }
        }
    }

    attachEventListeners() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.undoButton.addEventListener('click', () => this.undoMove());
        this.togglePauseButton.addEventListener('click', () => this.togglePause());
        this.rulesButton.addEventListener('click', () => this.showRules());
        this.playerSelect.addEventListener('change', (e) => {
            if (e.target.value === 'new') {
                this.addNewPlayer();
            } else {
                this.currentPlayer = e.target.value;
                this.updateRemoveButtonState();
                if (this.currentPlayer) {
                    this.checkForSavedGame();
                }
            }
        });
        this.modeSelect.addEventListener('change', (e) => {
            this.mode = e.target.value;
            // Clear highlights when switching modes
            this.clearHighlights();
            // Update highlights based on new mode
            if (this.mode !== 'computer' && !this.isPaused) {
                this.highlightValidMoves();
            }
        });
        this.removePlayerButton.addEventListener('click', () => this.removeCurrentPlayer());
    }

    checkForSavedGame() {
        const savedState = localStorage.getItem(`game_${this.currentPlayer}`);
        if (savedState) {
            // Create modal overlay
            const modal = document.createElement('div');
            modal.className = 'rules-modal'; // Reuse the rules modal styling

            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.className = 'rules-modal-content';

            // Add message
            const message = document.createElement('p');
            message.textContent = 'A saved game was found. Would you like to continue the previous game?';
            modalContent.appendChild(message);

            // Add buttons container for better layout
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '10px';
            buttonContainer.style.justifyContent = 'center';
            buttonContainer.style.marginTop = '20px';

            // Add resume button
            const resumeButton = document.createElement('button');
            resumeButton.textContent = 'Continue Previous Game';
            resumeButton.className = 'game-button';
            resumeButton.onclick = () => {
                this.resumeSavedGame(savedState);
                document.body.removeChild(modal);
            };

            // Add new game button
            const newGameButton = document.createElement('button');
            newGameButton.textContent = 'Start New Game';
            newGameButton.className = 'game-button';
            newGameButton.onclick = () => {
                document.body.removeChild(modal);
                // Clear the saved game
                localStorage.removeItem(`game_${this.currentPlayer}`);
            };

            buttonContainer.appendChild(resumeButton);
            buttonContainer.appendChild(newGameButton);
            modalContent.appendChild(buttonContainer);

            // Add modal to page
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
        }
    }

    resumeSavedGame(savedState) {
        const gameState = JSON.parse(savedState);
        
        // Restore all game state
        this.grid = gameState.grid;
        this.level = gameState.level;
        this.currentNumber = gameState.currentNumber;
        this.moveHistory = gameState.moveHistory;
        this.mode = gameState.mode;
        this.currentTurn = gameState.currentTurn || 'player'; // Default to player if not set
        this.level1Grid = gameState.level1Grid; // Make sure to preserve level 1 grid
        
        // Update the mode select to match saved state
        this.modeSelect.value = this.mode;
        
        // Update the display
        this.updateGrid();
        this.levelElement.textContent = this.level;
        this.updateInstructions();
        
        // Enable/disable buttons appropriately
        this.undoButton.disabled = false;
        this.togglePauseButton.textContent = 'Pause';
        this.isPaused = false;

        // Show success message
        this.showMessage('Previous game restored', 'success');

        // Handle computer's turn if applicable
        if (!this.isLevelComplete()) {
            if (this.mode === 'computer' || 
                (this.mode === 'vs' && this.currentTurn === 'computer')) {
                this.clearHighlights();
                setTimeout(() => this.playComputerMove(), 500);
            } else if ((this.mode === 'player' || 
                      (this.mode === 'vs' && this.currentTurn === 'player'))) {
                this.highlightValidMoves();
            }
        }
    }

    showRules() {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'rules-modal';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'rules-modal-content';
        
        // Add heading
        const heading = document.createElement('h2');
        heading.textContent = 'Game Rules';
        modalContent.appendChild(heading);
        
        // Add message
        const message = document.createElement('p');
        message.innerHTML = `The complete game rules are available on Canvas.<br><br>
            <a href="${this.rulesURL}" target="_blank">Click here to view the rules</a><br><br>
            (You must be logged into Canvas to access the rules)`;
        modalContent.appendChild(message);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.className = 'game-button';
        closeButton.onclick = () => document.body.removeChild(modal);
        modalContent.appendChild(closeButton);
        
        // Add modal to page
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }

    togglePause() {
        if (!this.isPaused) {
            // When pausing, save the game state
            this.saveGameState();
        }
        
        if (!this.currentPlayer && this.mode !== 'computer') {
            this.showMessage('No active player', 'error');
            return;
        }

        if (this.isPaused) {
            // Resume game
            const savedState = localStorage.getItem(`game_${this.currentPlayer || 'computer'}`);
            if (!savedState) {
                this.showMessage('No saved game found', 'error');
                return;
            }

            const gameState = JSON.parse(savedState);
            this.grid = gameState.grid;
            this.level = gameState.level;
            this.currentNumber = gameState.currentNumber;
            this.moveHistory = gameState.moveHistory;
            this.mode = gameState.mode;
            this.currentTurn = gameState.currentTurn;

            this.updateGrid();
            this.levelElement.textContent = this.level;
            this.updateInstructions();
            
            this.togglePauseButton.textContent = 'Pause';
            this.showMessage('Game resumed', 'success');

            // Handle computer's turn for both computer mode and vs mode
            if (!this.isLevelComplete()) {
                if (this.mode === 'computer' || 
                    (this.mode === 'vs' && this.currentTurn === 'computer')) {
                    this.clearHighlights();
                    setTimeout(() => this.playComputerMove(), 500);
                } else if (this.mode === 'vs' && this.currentTurn === 'player') {
                    this.highlightValidMoves();
                }
            }
        } else {
            // Pause game
            const gameState = {
                grid: this.grid,
                level: this.level,
                currentNumber: this.currentNumber,
                moveHistory: this.moveHistory,
                mode: this.mode,
                player: this.currentPlayer,
                currentTurn: this.currentTurn
            };

            localStorage.setItem(`game_${this.currentPlayer || 'computer'}`, JSON.stringify(gameState));
            this.togglePauseButton.textContent = 'Resume';
            this.showMessage('Game paused and saved', 'success');
        }

        this.isPaused = !this.isPaused;
        // Update highlights based on new pause state
        if (this.isPaused) {
            this.clearHighlights();
        } else if (this.mode === 'vs' && this.currentTurn === 'player') {
            this.highlightValidMoves();
        }
    }

    updateRemoveButtonState() {
        // Enable button only if a player is selected (not empty and not "new")
        this.removePlayerButton.disabled = !this.currentPlayer || this.currentPlayer === 'new';
    }

    addNewPlayer() {
        const name = prompt('Enter player name:');
        if (name) {
            this.players.add(name);
            localStorage.setItem('players', JSON.stringify([...this.players]));
            this.updatePlayersList();
            this.playerSelect.value = name;
            this.currentPlayer = name;
            // Update remove button state after adding new player
            this.updateRemoveButtonState();
        } else {
            this.playerSelect.value = this.currentPlayer || '';
            // Update remove button state if add was cancelled
            this.updateRemoveButtonState();
        }
    }

    removeCurrentPlayer() {
        if (!this.currentPlayer) {
            this.showMessage('Please select a player to remove', 'error');
            return;
        }

        const confirmRemove = confirm(`Are you sure you want to remove player "${this.currentPlayer}"?`);
        if (!confirmRemove) {
            return;
        }

        const removedPlayer = this.currentPlayer; // Store for message

        // Remove player from Set
        this.players.delete(this.currentPlayer);
        
        // Update localStorage
        localStorage.setItem('players', JSON.stringify([...this.players]));
        
        // Remove any saved game state for this player
        localStorage.removeItem(`game_${this.currentPlayer}`);
        
        // Reset current player
        this.currentPlayer = null;
        
        // Update the player select dropdown
        this.updatePlayersList();
        
        // Show success message
        this.showMessage(`Player "${removedPlayer}" has been removed`, 'success');
    }

    updatePlayersList() {
        this.playerSelect.innerHTML = '<option value="">Select Player</option>';
        this.players.forEach(player => {
            const option = document.createElement('option');
            option.value = player;
            option.textContent = player;
            this.playerSelect.appendChild(option);
        });
        const newOption = document.createElement('option');
        newOption.value = 'new';
        newOption.textContent = '+ Add New Player';
        this.playerSelect.appendChild(newOption);

        // Update remove button state
        this.updateRemoveButtonState();
    }

    startGame() {
        this.messageElement.textContent = '';
        this.messageElement.className = 'message';
    
        if (!this.currentPlayer && this.mode !== 'computer') {
            this.showMessage('Please select a player', 'error');
            return;
        }
    
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(null));
        this.level = 1;
        this.currentNumber = 1;
        this.moveHistory = [];
        this.currentTurn = this.mode === 'computer' ? 'computer' : 'player';
        this.computerMoveInProgress = false;
        this.level1Grid = null;
        this.isPaused = false;
        this.togglePauseButton.textContent = 'Pause';
        this.undoButton.disabled = false;
    
        // Place initial number 1 randomly in inner grid
        const row = Math.floor(Math.random() * this.innerSize) + 1;
        const col = Math.floor(Math.random() * this.innerSize) + 1;
        this.grid[row][col] = 1;
        this.moveHistory.push({ row, col, number: 1 });
    
        this.updateGrid();
        this.updateLevel();
    
        // Start computer play if in computer mode
        if (this.mode === 'computer') {
            setTimeout(() => this.playComputerMove(), 500);
        }
    }

    handleCellClick(row, col) {
        if (this.computerMoveInProgress || 
            (this.mode === 'computer') || 
            (this.mode === 'vs' && this.currentTurn === 'computer') ||
            this.isPaused) {
            return;
        }
    
        const validation = this.isValidMove(row, col);
        if (!validation.valid) {
            this.showMessage(validation.message, 'error');
            return;
        }
    
        // Clear any existing message when making a valid move
        this.messageElement.textContent = '';
        this.messageElement.className = 'message';
    
        this.makeMove(row, col);
    }


    makeMove(row, col) {
        this.currentNumber++;
        this.grid[row][col] = this.currentNumber;
        this.moveHistory.push({ row, col, number: this.currentNumber });
        
        this.updateGrid();
        
        if (this.isLevelComplete()) {
            if (this.level === 3) {
                this.showMessage('Game Complete!', 'success');
            } else {
                this.advanceLevel();
                // Continue computer play if in computer mode
                if (this.mode === 'computer') {
                    setTimeout(() => this.playComputerMove(), 500);
                }
            }
        } else {
            if (this.mode === 'vs' && !this.isPaused) {
                // Update turn tracking for vs mode
                this.currentTurn = (this.currentTurn === 'player') ? 'computer' : 'player';
                
                // Update the grid to show the current move
                this.updateGrid();
                
                // If it's computer's turn and not paused, schedule the computer move
                if (this.currentTurn === 'computer' && !this.isPaused) {
                    setTimeout(() => this.playComputerMove(), 500);
                } else if (this.currentTurn === 'player') {
                    // If it's player's turn, show valid moves
                    this.highlightValidMoves();
                }
            } else if (this.mode === 'computer' && !this.isPaused) {
                // In computer mode, continue playing after a short delay
                setTimeout(() => this.playComputerMove(), 500);
            }
        }
    }

    clearHighlights() {
        const cells = this.gridElement.children;
        for (let cell of cells) {
            cell.classList.remove('valid');
        }
    }

    isValidMove(row, col) {
        if (this.grid[row][col] !== null) {
            return { valid: false, message: "Cell is already occupied" };
        }
    
        const prevMove = this.moveHistory[this.moveHistory.length - 1];
        
        switch (this.level) {
            case 1:
                if (row < 1 || row > 5 || col < 1 || col > 5) {
                    return { valid: false, message: "Must place number in the inner 5x5 grid" };
                }
                if (Math.abs(row - prevMove.row) > 1 || Math.abs(col - prevMove.col) > 1) {
                    return { valid: false, message: "Number must be adjacent to the previous number" };
                }
                return { valid: true };
    
            case 2: {
                if (row !== 0 && row !== 6 && col !== 0 && col !== 6) {
                    return { valid: false, message: "Must place number in the outer ring" };
                }
    
                // Find position of the next number in inner grid
                let innerPos = null;
                const nextNumber = this.currentNumber + 1;
                for (let i = 1; i <= 5; i++) {
                    for (let j = 1; j <= 5; j++) {
                        if (this.grid[i][j] === nextNumber) {
                            innerPos = { row: i, col: j };
                            break;
                        }
                    }
                    if (innerPos) break;
                }
    
                if (!innerPos) {
                    return { valid: false, message: "Cannot find position for this number in inner grid" };
                }
    
                const isValidEnd = 
                    ((row === 0 || row === 6) && col === innerPos.col) || 
                    ((col === 0 || col === 6) && row === innerPos.row);
    
                const isValidDiagonal = 
                    (this.isOnMainDiagonal(innerPos.row, innerPos.col) && 
                     ((row === 0 && col === 0) || (row === 6 && col === 6))) ||
                    (this.isOnSecondaryDiagonal(innerPos.row, innerPos.col) && 
                     ((row === 0 && col === 6) || (row === 6 && col === 0)));
    
                if (!isValidEnd && !isValidDiagonal) {
                    return { valid: false, message: "Must place number at the end of its row/column or diagonal from inner grid" };
                }
                return { valid: true };
            }
    
            case 3: {
                // Must be in inner grid
                if (row < 1 || row > 5 || col < 1 || col > 5) {
                    return { valid: false, message: "Must place number in the inner 5x5 grid" };
                }
    
                // Must be adjacent to previous number
                if (Math.abs(row - prevMove.row) > 1 || Math.abs(col - prevMove.col) > 1) {
                    return { valid: false, message: "Must be adjacent to the previous number" };
                }
    
                const nextNumber = this.currentNumber + 1;
    
                // Check if the cell is on a row or column that has the number in its ends
                const hasNumberInRowEnds = 
                    this.grid[row][0] === nextNumber || 
                    this.grid[row][6] === nextNumber;
                
                const hasNumberInColEnds = 
                    this.grid[0][col] === nextNumber || 
                    this.grid[6][col] === nextNumber;
    
                // Special case for diagonal cells
                const isOnMainDiagonal = row - 1 === col - 1;
                const isOnSecondaryDiagonal = row - 1 + col - 1 === 4;
                
                const hasNumberInDiagonalEnds = 
                    ((isOnMainDiagonal && (this.grid[0][0] === nextNumber || this.grid[6][6] === nextNumber)) ||
                     (isOnSecondaryDiagonal && (this.grid[0][6] === nextNumber || this.grid[6][0] === nextNumber)));
    
                // The cell must either:
                // 1. Be in a row/column with the number in its ends, OR
                // 2. Be on a diagonal AND have the number in the diagonal ends
                if (!hasNumberInRowEnds && !hasNumberInColEnds && !hasNumberInDiagonalEnds) {
                    return { valid: false, message: "Cell must be in a row/column with the number in its ends or on a diagonal with the number in its ends" };
                }
    
                return { valid: true };
            }
    
            default:
                return { valid: false, message: "Invalid level" };
        }
    }

    findLevel1Position(number) {
        for (let i = 1; i <= 5; i++) {
            for (let j = 1; j <= 5; j++) {
                if (this.level === 2 && this.grid[i][j] === number) {
                    return { row: i, col: j };
                }
            }
        }
        return null;
    }

    isOnMainDiagonal(row, col) {
        return row - 1 === col - 1;
    }

    isOnSecondaryDiagonal(row, col) {
        return row - 1 + col - 1 === 4;
    }

    checkDiagonalNumbers(number) {
        // Check if number exists in diagonal corners
        return (this.grid[0][0] === number || 
                this.grid[0][6] === number || 
                this.grid[6][0] === number || 
                this.grid[6][6] === number);
    }

    async playComputerMove() {
        // Check conditions that would prevent a computer move
        if (this.isPaused || 
            this.currentNumber >= 25 || 
            (this.mode === 'vs' && this.currentTurn !== 'computer')) {
            return;
        }
        
        // Set flag to prevent multiple simultaneous moves
        if (this.computerMoveInProgress) {
            return;
        }
        
        this.computerMoveInProgress = true;
        this.clearHighlights();  // Clear highlights at start of computer move
    
        // Find all valid moves
        const validMoves = [];
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const validation = this.isValidMove(i, j);
                if (validation.valid) {
                    validMoves.push({ row: i, col: j });
                }
            }
        }
    
        if (validMoves.length === 0) {
            this.showMessage('Computer has no valid moves available. Game over.', 'error');
            this.computerMoveInProgress = false;
            return;
        }
    
        // Visual delay to show computer "thinking"
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check pause state again after delay
        if (this.isPaused) {
            this.computerMoveInProgress = false;
            return;
        }
    
        // Randomly select from valid moves
        const move = validMoves[Math.floor(Math.random() * validMoves.length)];
        
        // Clear any existing messages
        this.messageElement.textContent = '';
        this.messageElement.className = 'message';
    
        // Make the move
        this.grid[move.row][move.col] = this.currentNumber + 1;
        this.moveHistory.push({ row: move.row, col: move.col, number: this.currentNumber + 1 });
        this.currentNumber++;
        
        // Update display
        this.updateGrid();
        
        // Reset flag
        this.computerMoveInProgress = false;

        // Check if level is complete
        if (this.isLevelComplete()) {
            if (this.level === 3) {
                this.showMessage('Game Complete!', 'success');
            } else {
                this.advanceLevel();
                if (this.mode === 'computer') {
                    setTimeout(() => this.playComputerMove(), 500);
                }
            }
        } else if (!this.isPaused) {
            // Continue playing if in computer mode
            if (this.mode === 'computer') {
                setTimeout(() => this.playComputerMove(), 500);
            } else if (this.mode === 'vs') {
                // In VS mode, switch turns
                this.currentTurn = 'player';
                this.highlightValidMoves();
            }
        }
    }


    isLevelComplete() {
        return this.currentNumber === 25;
    }

    advanceLevel() {
        if (this.level === 1) {
            // Store Level 1 grid state before advancing
            this.level1Grid = this.grid.map(row => [...row]);
        }
        
        this.level++;
        this.levelElement.textContent = this.level;
        this.currentNumber = 1;
        
        if (this.level === 2) {
            // Preserve inner grid for Level 2
            const innerGrid = this.grid.map(row => [...row]);
            this.grid = Array(this.size).fill().map(() => Array(this.size).fill(null));
            // Copy inner grid values back
            for (let i = 1; i <= 5; i++) {
                for (let j = 1; j <= 5; j++) {
                    this.grid[i][j] = innerGrid[i][j];
                }
            }
            // Reset move history for Level 2
            this.moveHistory = [];
        } else if (this.level === 3) {
            // Preserve outer ring from Level 2
            const outerRing = this.grid.map(row => [...row]);
            
            // Initialize new grid
            this.grid = Array(this.size).fill().map(() => Array(this.size).fill(null));
            
            // Copy outer ring values back
            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    if (i === 0 || i === 6 || j === 0 || j === 6) {
                        this.grid[i][j] = outerRing[i][j];
                    }
                }
            }
    
            // Find position of number 1 from Level 1 grid
            let number1Pos = null;
            for (let i = 1; i <= 5; i++) {
                for (let j = 1; j <= 5; j++) {
                    if (this.level1Grid[i][j] === 1) {
                        number1Pos = { row: i, col: j };
                        break;
                    }
                }
                if (number1Pos) break;
            }
    
            // Place number 1 in the same position as Level 1
            if (number1Pos) {
                this.grid[number1Pos.row][number1Pos.col] = 1;
                this.moveHistory = [{ row: number1Pos.row, col: number1Pos.col, number: 1 }];
            }
        }
    
        this.updateGrid();
        this.updateInstructions();
        this.showMessage(`Level ${this.level} started!`, 'success');
    
        // Continue computer play if in computer mode
        if (this.mode === 'computer') {
            setTimeout(() => this.playComputerMove(), 500);
        }
    }

    undoMove() {
        if (this.moveHistory.length <= 1) {
            this.showMessage('Cannot undo further', 'error');
            return;
        }
    
        if (this.mode === 'vs') {
            // In vs mode, we need to undo both player and computer moves
            const lastMove = this.moveHistory.pop();
            this.grid[lastMove.row][lastMove.col] = null;
            this.currentNumber--;
    
            // If it's player's turn, undo computer's move too
            if (this.currentTurn === 'player') {
                const computerMove = this.moveHistory.pop();
                this.grid[computerMove.row][computerMove.col] = null;
                this.currentNumber--;
                this.currentTurn = 'player'; // Keep it player's turn after undoing
            } else {
                // If it's computer's turn, just change turn to player
                this.currentTurn = 'player';
            }
        } else {
            // Regular undo for other modes
            const lastMove = this.moveHistory.pop();
            this.grid[lastMove.row][lastMove.col] = null;
            this.currentNumber--;
        }
    
        this.updateGrid();
        this.highlightValidMoves(); // Show valid moves after undo
    }

    updateGrid() {
        const cells = this.gridElement.children;
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const cellIndex = i * this.size + j;
                cells[cellIndex].textContent = this.grid[i][j] || '';
            }
        }
        
        // Show valid moves if appropriate
        if (this.mode === 'player' || 
            (this.mode === 'vs' && this.currentTurn === 'player')) {
            this.highlightValidMoves();
        }
    }

    highlightValidMoves() {
        // First clear all highlights
        this.clearHighlights();
    
        // Only highlight if:
        // 1. Game is not paused AND
        // 2. Either:
        //    a. It's in player mode OR
        //    b. In vs mode and it's player's turn
        // 3. Computer move is not in progress
        if (this.isPaused || 
            this.mode === 'computer' || 
            (this.mode === 'vs' && this.currentTurn === 'computer') || 
            this.computerMoveInProgress) {
            return;
        }
    
        const cells = this.gridElement.children;
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const validation = this.isValidMove(i, j);
                if (validation.valid) {
                    const cellIndex = i * this.size + j;
                    cells[cellIndex].classList.add('valid');
                }
            }
        }
    }

    updateInstructions() {
        const instructions = document.getElementById('instructions');
        switch (this.level) {
            case 1:
                instructions.textContent = 'Place numbers from 2 to 25 in ascending order. They must be adjacent to the previous number.';
                break;
            case 2:
                instructions.textContent = 'Place numbers 2-25 in the outer ring. Numbers must be placed at the ends of rows/columns or diagonals containing their Level 1 position.';
                break;
            case 3:
                instructions.textContent = 'Fill the inner grid again with numbers 2-25. Numbers must be adjacent to the previous number AND in a row/column with the same number in the outer ring.';
                break;
        }
    }

    showMessage(text, type = '') {
        this.messageElement.textContent = text;
        this.messageElement.className = 'message';
        if (type) {
            this.messageElement.classList.add(type);
        }
    }

    saveGameState() {
        if (!this.currentPlayer && this.mode !== 'computer') return;
        
        const gameState = {
            grid: this.grid,
            level: this.level,
            currentNumber: this.currentNumber,
            moveHistory: this.moveHistory,
            mode: this.mode,
            player: this.currentPlayer,
            currentTurn: this.currentTurn,
            level1Grid: this.level1Grid // Save level 1 grid state
        };

        localStorage.setItem(`game_${this.currentPlayer || 'computer'}`, JSON.stringify(gameState));
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new NumberGame();
});