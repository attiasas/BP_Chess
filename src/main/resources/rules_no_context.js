
var autoMovesBlack = true;
var autoMovesWhite = true;

//<editor-fold desc="Global Events and Sets">

//<editor-fold desc="Creation Functions And Sets">
var initComplete = bp.EventSet("", function (e) {
    return e.name.equals("Done Populate");
});

var pieceCreation = bp.EventSet("", function (e) {
    return e.name.equals("Create");
});

function pieceCreationInCell(cell) {
    return bp.EventSet("", function (e) {
        return pieceCreation.contains(e) && e.data.cell.equals(cell);
    });
}

var pawnCreation = bp.EventSet("Create Pawns", function (e) {
    return pieceCreation.contains(e) && e.data.piece.type.equals(Piece.Type.Pawn);
});

var rookCreation = bp.EventSet("Create Rooks", function (e) {
    return pieceCreation.contains(e) && e.data.piece.type.equals(Piece.Type.Rook);
});

var kingCreation = bp.EventSet("Create Kings", function (e) {
    return pieceCreation.contains(e) && e.data.piece.type.equals(Piece.Type.King);
});

var knightCreation  = bp.EventSet("Create Knights", function (e) {
    return pieceCreation.contains(e) && e.data.piece.type.equals(Piece.Type.Knight);
});
//</editor-fold>

//<editor-fold desc="Move Sets Functions">
function moveTo(cell) {
    return bp.EventSet("", function (e) {
        return (e instanceof Move) && e.target.equals(cell);
    });
}

function moveFrom(cell) {
    return bp.EventSet("", function (e) {
        return (e instanceof Move) && e.source.equals(cell);
    });
}

function moveToWithColor(destination, color) {
    return bp.EventSet("", function (e) {
        return e instanceof Move && e.target.equals(destination) &&
            e.piece.color.equals(color);
    });
}

function moveToWithPiece(destination, piece) {
    return bp.EventSet("", function (e) {
        return e instanceof Move && e.target.equals(destination) &&
            e.piece.equals(piece);
    });
}

function pieceMove(piece) {
    return bp.EventSet("", function (e) {
        return (e instanceof Move) && e.piece.equals(piece);
    });
}
//</editor-fold>

//<editor-fold desc="Global Move Sets">
var stateUpdate = bp.EventSet("",function (e) {
    return e.name.equals("StateUpdate");
});

var moves = bp.EventSet("Game Moves", function (e) {
    return (e instanceof Move);
});

var whiteMoves = bp.EventSet("White Moves",function (e) {
    return moves.contains(e) && (e.piece !== null) && (Piece.Color.White.equals(e.piece.color));
});

var blackMoves = bp.EventSet("black Moves",function (e) {
    return moves.contains(e) && (e.piece !== null) && (Piece.Color.Black.equals(e.piece.color));
});

var outBoundsMoves = bp.EventSet("",function (e) {
    return moves.contains(e) && (e.source.row < 0 || e.source.row > 7 || e.source.column < 0 || e.source.column > 7 || e.target.row < 0 || e.target.row > 7 || e.target.column < 0 || e.target.column > 7);
});

var staticMoves = bp.EventSet("Non Moves",function (e) {
    return moves.contains(e) && e.source.equals(e.target);
});

// not exist -> bp.EventSet.allExcept(stateUpdate)
var allExceptStateUpdate = bp.EventSet("", function (e) {
    return !stateUpdate.contains(e);
});

//</editor-fold>

//</editor-fold>

//<editor-fold desc="General Rules">
bp.registerBThread("UpdateStateAfterMove", function () {
    // init board
    var board = bp.sync({waitFor:initComplete, block:moves}).data;
    bp.sync({request: bp.Event("StateUpdate", {board:board,lastMove:null}),block:moves});

    while (true){
        var e = bp.sync({waitFor:moves});
        //update board
        board[e.source.row][e.source.column] = null;
        board[e.target.row][e.target.column] = e.piece;

        bp.sync({request: bp.Event("StateUpdate", {board:board, lastMove: e})});
    }
});

bp.registerBThread("EnforceTurns",function () {

    while (true)
    {
        bp.sync({waitFor:whiteMoves,block:blackMoves});
        bp.sync({waitFor:stateUpdate, block:allExceptStateUpdate});

        bp.sync({waitFor:blackMoves,block:whiteMoves});
        bp.sync({waitFor:stateUpdate, block:allExceptStateUpdate});
    }
});

bp.registerBThread("Movement in bounds",function () {
    bp.sync({block:outBoundsMoves});
});

bp.registerBThread("Enforce Movement to a new cell", function () {
    bp.sync({block:staticMoves});
});

bp.registerBThread("don't move if eaten ", function() {
    while(true) {
        var pieceCreation = bp.sync({waitFor: pieceCreation}).data;
        var piece = pieceCreation.piece;
        var initCell = pieceCreation.cell;

        bp.registerBThread("don't move if eaten " + piece, function() {
            var cell = initCell;
            var myPiece = piece;
            while(true) {
                var e = bp.sync({waitFor: [pieceMove(myPiece), moveTo(cell)] });
                if(e.target.equals(cell)) {
                    bp.sync({block:pieceMove(myPiece)});
                } else {
                    cell = e.target;
                }
            }
        });
    }
});

function cellRules() {
    var i,j;
    for(i = 0 ; i < 8; i++) {
        for(j = 0 ; j < 8; j++) {(function (i,j) {
            var cell = Cell(i,j);
            bp.registerBThread("don't move to a cell with the same color " + cell, function() {
                var piece = null;
                var e;
                while(true) {
                    if(piece === null)
                    {
                        e = bp.sync({waitFor: [moveTo(cell), pieceCreationInCell(cell)]});

                        if(e instanceof Move) piece = e.piece;
                        else piece = e.data.piece;
                    }
                    else
                    {
                        e = bp.sync({waitFor: [moveTo(cell),moveFrom(cell)], block: moveToWithColor(cell, piece.color)});

                        piece = (moveTo(cell).contains(e)) ? e.piece : null;

                    }
                }
            });
        })(i,j);
        }
    }
}

cellRules();

function inRange(row,column)
{
    return row >= 0 && row < 8 && column >= 0 && column < 8
}
//</editor-fold>

//TODO: (KING) Rule: "If a player's king is placed in check and there is no legal move that player can make to escape check, then the king is said to be checkmated, the game ends.
// (If it is not possible to get out of check, the king is checkmated and the game is over)"

//TODO: (KING) Rule: "A king is in check when it is under attack by at least one enemy piece."
//TODO: (GENERAL) Rule: "It is illegal to make a move that places or leaves one's king in check."
//TODO: Rule: "Castling consists of moving the king two squares towards a rook, then placing the rook on the other side of the king, adjacent to it."
// * The king and rook involved in castling must not have previously moved
// * There must be no pieces between the king and the rook
// * The king may not currently be in check, nor may the king pass through or end up in a square that is under attack by an enemy piece
//TODO: (PAWN) Rule: "En passant - When a pawn advances two squares from its original square and ends the turn adjacent to a pawn of the opponent's on the same rank, it may be captured by that pawn of the opponent's, as if it had moved only one square forward."
// * This capture is only legal on the opponent's next move immediately following the first pawn's advance.

//TODO: (BISHOP) Rule: "A bishop moves any number of vacant squares diagonally."
//TODO: (QUEEN) Rule: "The queen moves any number of vacant squares horizontally, vertically, or diagonally."

//<editor-fold desc="Pawn Rules">
bp.registerBThread("pawn rules", function(){
    while (true)
    {
        var pawnCreationEvent = bp.sync({waitFor:pawnCreation}).data;

        var pawn = pawnCreationEvent.piece;
        var initCell = pawnCreationEvent.cell;
        var forward = pawn.color.equals(Piece.Color.Black) ? -1 : 1;

        if(autoMovesBlack && (pawn.color.equals(Piece.Color.Black)) || (autoMovesWhite && pawn.color.equals(Piece.Color.White)))
        {
            // Rule: "A pawn moves straight forward one square, if that square is vacant."
            bp.registerBThread("move " + pawn + " one forward ", function()
            {
                var cell = initCell;
                var myPawn = pawn;
                var myForward = forward;

                while(true) {

                    var state = bp.sync({waitFor:stateUpdate, interrupt:moveTo(cell)}).data;

                    if(pieceMove(myPawn).contains(state.lastMove))
                    {
                        cell = state.lastMove.target;
                    }

                    if(inRange(cell.row + myForward,cell.column) && state.board[cell.row + myForward][cell.column] === null) // in Range
                    {
                        var myMove = Move(cell, Cell(cell.row + myForward, cell.column), myPawn);
                        bp.sync({ request: myMove, waitFor:moves, interrupt:moveTo(cell)});
                    }
                }
            });

            // Rule: "If it has not yet moved, a pawn also has the option of moving two squares straight forward, provided both squares are vacant."
            bp.registerBThread("move " + pawn + " two forward", function()
            {
                var cell = initCell;
                var myPawn = pawn;
                var myForward = forward;

                while (true)
                {
                    var state = bp.sync({waitFor:stateUpdate, interrupt:[moveTo(cell),pieceMove(myPawn)]}).data;

                    if(state.board[cell.row + myForward][cell.column] === null && state.board[cell.row + myForward*2][cell.column] === null)
                    {
                        bp.sync({
                            request: Move(cell, Cell(cell.row + myForward*2, cell.column),myPawn),
                            waitFor:moves,
                            interrupt: [pieceMove(myPawn),moveTo(Cell)]
                        });
                    }
                }
            });

            // Rule: "A pawn can capture an enemy piece on either of the two squares diagonally in front of the pawn (but cannot move to those squares if they are vacant)."
            bp.registerBThread(pawn + " Eat Movement", function() {
                var cell = initCell;
                var myPawn = pawn;
                var myForward = forward;

                while(true)
                {
                    var state = bp.sync({waitFor:stateUpdate, interrupt:moveTo(cell)}).data;

                    if(pieceMove(myPawn).contains(state.lastMove))
                    {
                        cell = state.lastMove.target;
                    }

                    var optionalMoves = [];
                    var currentBoard = state.board;

                    // check in state.board if these cells has enemies - then eat
                    if(inRange(cell.row + myForward,cell.column + 1) && currentBoard[cell.row + myForward][cell.column + 1] !== null) optionalMoves.push(Move(cell, Cell(cell.row + myForward, cell.column + 1), myPawn));
                    if(inRange(cell.row + myForward,cell.column - 1) && currentBoard[cell.row + myForward][cell.column - 1] !== null) optionalMoves.push(Move(cell, Cell(cell.row + myForward, cell.column - 1), myPawn));

                    bp.sync({request: optionalMoves, waitFor:moves,interrupt:moveTo(cell)});
                }
            });
        }
    }
});
//</editor-fold>

//<editor-fold desc="King Rules">
bp.registerBThread("king rules", function ()
{
    while (true)
    {
        var kingCreationEvent = bp.sync({waitFor:kingCreation}).data;

        var king = kingCreationEvent.piece;
        var initCell = kingCreationEvent.cell;
        var otherColor = king.color.equals(Piece.Color.White) ? Piece.Color.Black : Piece.Color.White;

        if(autoMovesBlack && (king.color.equals(Piece.Color.Black)) || (autoMovesWhite && king.color.equals(Piece.Color.White)))
        {
            // Rule: "The king moves exactly one square horizontally, vertically, or diagonally."
            bp.registerBThread(king + " Movement", function() {
                var cell = initCell;
                var myKing = king;

                while(true)
                {
                    var state = bp.sync({waitFor:stateUpdate, interrupt:moveTo(cell)}).data;

                    if(pieceMove(myKing).contains(state.lastMove))
                    {
                        cell = state.lastMove.target;
                    }

                    var optionalMoves = [];
                    for(var row = cell.row - 1; row <= cell.row + 1; row++)
                    {
                        for(var col = cell.column - 1; col <= cell.column + 1; col++)
                        {
                            if(inRange(row,col) && (cell.row != row || cell.column != col)) optionalMoves.push(Move(cell, Cell(row, col), myKing));
                        }
                    }

                    bp.sync({request: optionalMoves, waitFor:moves,interrupt:moveTo(cell)});
                }
            });
        }

        bp.registerBThread("Detect " + otherColor + " Win", function () {
            var cell = initCell;
            var myKing = king;
            var otherColorGroup = otherColor;
            var moveEvent;

            while(true)
            {
                moveEvent = bp.sync({waitFor: [moveTo(cell),pieceMove(myKing)]
                });

                if(pieceMove(myKing).contains(moveEvent)) cell = moveEvent.target;
                else
                {
                    bp.sync({request: bp.Event("Game Over - " + otherColorGroup + " Wins"),block:moves});
                    bp.sync({block:moves});
                }
            }
        });
    }
});
//</editor-fold>

//<editor-fold desc="Knight Rules">
bp.registerBThread("knight rules", function ()
{
    while (true)
    {
        var knightCreationEvent = bp.sync({waitFor:knightCreation}).data;

        var knight = knightCreationEvent.piece;
        var initCell = knightCreationEvent.cell;

        if(autoMovesBlack && (knight.color.equals(Piece.Color.Black)) || (autoMovesWhite && knight.color.equals(Piece.Color.White)))
        {
            // Rule: "A knight moves to the nearest square not on the same rank, file, or diagonal. (i.e. in an "L" pattern)"
            bp.registerBThread(knight + " Movement", function() {
                var cell = initCell;
                var myKnight = knight;

                while(true)
                {
                    var state = bp.sync({waitFor:stateUpdate, interrupt:moveTo(cell)}).data;

                    if(pieceMove(myKnight).contains(state.lastMove))
                    {
                        cell = state.lastMove.target;
                    }

                    var optionalMoves = [];
                    optionalMoves.push(Move(cell, Cell(cell.row - 1, cell.column - 2), myKnight));
                    optionalMoves.push(Move(cell, Cell(cell.row - 2, cell.column - 1), myKnight));
                    optionalMoves.push(Move(cell, Cell(cell.row - 2, cell.column + 1), myKnight));
                    optionalMoves.push(Move(cell, Cell(cell.row - 1, cell.column + 2), myKnight));
                    optionalMoves.push(Move(cell, Cell(cell.row + 1, cell.column - 2), myKnight));
                    optionalMoves.push(Move(cell, Cell(cell.row + 2, cell.column - 1), myKnight));
                    optionalMoves.push(Move(cell, Cell(cell.row + 1, cell.column + 2), myKnight));
                    optionalMoves.push(Move(cell, Cell(cell.row + 2, cell.column + 1), myKnight));

                    bp.sync({request: optionalMoves, waitFor:moves,interrupt:moveTo(cell)});
                }
            });
        }
    }
});
//</editor-fold>

//<editor-fold desc="Rook Rules">
bp.registerBThread("rook rules", function ()
{
    while (true)
    {
        var rookCreationEvent = bp.sync({waitFor:rookCreation}).data;

        var rook = rookCreationEvent.piece;
        var initCell = rookCreationEvent.cell;

        if(autoMovesBlack && (rook.color.equals(Piece.Color.Black)) || (autoMovesWhite && rook.color.equals(Piece.Color.White)))
        {
            // Rule: "A rook moves any number of vacant squares horizontally or vertically."
            bp.registerBThread(rook + " Movement", function() {
                var cell = initCell;
                var myRook = rook;

                while(true)
                {
                    var state = bp.sync({waitFor:stateUpdate, interrupt:moveTo(cell)}).data;

                    if(pieceMove(myRook).contains(state.lastMove))
                    {
                        cell = state.lastMove.target;
                    }

                    var optionalMoves = [];

                    // bottom
                    for(var row = cell.row - 1; row >= 0; row--)
                    {
                        optionalMoves.push(Move(cell, Cell(row, cell.column), myRook));
                        if(state.board[row][cell.column] !== null) break;
                    }
                    // top
                    for(var row = cell.row + 1; row < 8; row++)
                    {
                        optionalMoves.push(Move(cell, Cell(row, cell.column), myRook));
                        if(state.board[row][cell.column] !== null) break;
                    }
                    // left
                    for(var col = cell.column - 1; col >= 0; col--)
                    {
                        optionalMoves.push(Move(cell, Cell(cell.row, col), myRook));
                        if(state.board[cell.row][col] !== null) break;
                    }
                    // right
                    for(var col = cell.column + 1; col < 8; col++)
                    {
                        optionalMoves.push(Move(cell, Cell(cell.row, col), myRook));
                        if(state.board[cell.row][col] !== null) break;
                    }

                    bp.sync({request: optionalMoves, waitFor:moves,interrupt:moveTo(cell)});
                }
            });
        }
    }
});
//</editor-fold>

/*//<editor-fold desc="Bishop Rules">
bp.registerBThread("rook rules", function () {
    while (true) {
        var rookCreationEvent = bp.sync({waitFor: rookCreation}).data;

        var rook = rookCreationEvent.piece;
        var initCell = rookCreationEvent.cell;

        if (autoMovesBlack && (rook.color.equals(Piece.Color.Black)) || (autoMovesWhite && rook.color.equals(Piece.Color.White))) {

        }
    }
});
//</editor-fold>

//<editor-fold desc="Queen Rules">
bp.registerBThread("rook rules", function () {
    while (true) {
        var rookCreationEvent = bp.sync({waitFor: rookCreation}).data;

        var rook = rookCreationEvent.piece;
        var initCell = rookCreationEvent.cell;

        if (autoMovesBlack && (rook.color.equals(Piece.Color.Black)) || (autoMovesWhite && rook.color.equals(Piece.Color.White))) {

        }
    }
});
//</editor-fold>*/