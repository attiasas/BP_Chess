
var autoMovesBlack = true;
var autoMovesWhite = true;

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

var bishopCreation  = bp.EventSet("Create Bishops", function (e) {
    return pieceCreation.contains(e) && e.data.piece.type.equals(Piece.Type.Bishop);
});

var queenCreation  = bp.EventSet("Create Queens", function (e) {
    return pieceCreation.contains(e) && e.data.piece.type.equals(Piece.Type.Queen);
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

function allMovesExcept(move) {
    return bp.EventSet("all exceot " + move, function (e) {
       return (e instanceof Move) && (!e.source.equals(move.source) || !e.target.equals(move.target) || !e.piece.equals(move.piece));
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

function enPassantOnPiece(pawn) {
    return bp.EventSet("", function (e) {
       return enPassantMove.contains(e) && e.piece2.equals(pawn);
    });
}
//</editor-fold>

//<editor-fold desc="Global Move Sets">
var stateUpdate = bp.EventSet("",function (e) {
    return e.name.equals("StateUpdate");
});

var checkUpdate = bp.EventSet("",function (e) {
    return e.name.equals("KingInCheckUpdate");
});

var moves = bp.EventSet("Game Moves", function (e) {
    return (e instanceof Move);
});

var castlingMove = bp.EventSet("Castling Moves", function (e) {
   return (e instanceof Castling);
});

var enPassantMove = bp.EventSet("EnPassant Moves", function (e) {
   return (e instanceof EnPassant);
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

        if(enPassantMove.contains(e))
        {
            board[e.source.row][e.target.column] = null;
        }

        bp.sync({request: bp.Event("StateUpdate", {board:board, lastMove: e})});
    }
});

bp.registerBThread("EnforceTurns",function () {

    var secondMove;
    while (true)
    {
        var currentWhiteMove = bp.sync({waitFor:whiteMoves,block:blackMoves});
        bp.sync({waitFor:stateUpdate, block:allExceptStateUpdate});
        if(castlingMove.contains(currentWhiteMove))
        {
            secondMove = Move(currentWhiteMove.source2,currentWhiteMove.target2,currentWhiteMove.piece2);
            bp.log.info("Blocking: " + allMovesExcept(secondMove));
            bp.sync({request:secondMove,block:allMovesExcept(secondMove)});
            bp.log.info("Done Blocking");
            bp.sync({waitFor:stateUpdate, block:allExceptStateUpdate});
        }

        var currentBlackMove = bp.sync({waitFor:blackMoves,block:whiteMoves});
        bp.sync({waitFor:stateUpdate, block:allExceptStateUpdate});
        if(castlingMove.contains(currentBlackMove))
        {
            secondMove = Move(currentBlackMove.source2,currentBlackMove.target2,currentBlackMove.piece2);
            bp.log.info("Blocking: " + allMovesExcept(secondMove));
            bp.sync({request:secondMove,block:allMovesExcept(secondMove)});
            bp.log.info("Done Blocking");
            bp.sync({waitFor:stateUpdate, block:allExceptStateUpdate});
        }
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
        var createEvent = bp.sync({waitFor:pieceCreation}).data;
        var piece = createEvent.piece;
        var initCell = createEvent.cell;

        bp.registerBThread("don't move if eaten " + piece, function() {
            var cell = initCell;
            var myPiece = piece;
            while(true) {
                var e = bp.sync({waitFor: [pieceMove(myPiece), moveTo(cell), enPassantOnPiece(myPiece)] });
                if(e.target.equals(cell) || enPassantMove.contains(e)) {
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
            var cell = new Cell(i,j);
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

// Rule: The game ends in a draw if any of these conditions occur:
//          king against king
//          king against king and bishop
//          king against king and knight
bp.registerBThread("Detect Draw",function () {
   while (true)
   {
       var state = bp.sync({waitFor:stateUpdate}).data;
       var whitePieces = [];
       var blackPieces = [];

       // get pieces
       for(var row = 0; row < state.board.length; row++)
       {
           for(var col = 0; col < state.board[row].length; col++)
           {
               if(state.board[row][col] !== null && state.board[row][col].color.equals(Piece.Color.White))
               {
                   whitePieces.push(state.board[row][col]);
               }
               else if(state.board[row][col] instanceof Piece) blackPieces.push(state.board[row][col]);
           }
       }

       // king against king
       if(whitePieces.length === 1 && blackPieces.length === 1)
       {
           bp.sync({request:bp.Event("DrawState"),block:moves});
           bp.sync({block:moves});
       }
       else if((whitePieces.length === 1 || blackPieces.length === 1) && (whitePieces.length === 2 || blackPieces.length === 2))
       {
           // king against king and bishop
           // king against king and knight
           var notOnlyKing = whitePieces.length === 1 ? blackPieces: whitePieces;
           var found = false;
           for(var i = 0; i < notOnlyKing.length && !found; i++)
           {
               if(notOnlyKing[i].type.equals(Piece.Type.Bishop) || notOnlyKing[i].type.equals(Piece.Type.Knight)) found = true;
           }

           if(found)
           {
               bp.sync({request:bp.Event("DrawState"),block:moves});
               bp.sync({block:moves});
           }
       }
   }

});

//</editor-fold>

//<editor-fold desc="Help Functions">
function inRange(row,column)
{
    return row >= 0 && row < 8 && column >= 0 && column < 8
}

function containsMove(list,moveToCheck) {
    if(list === null || moveToCheck === null) return false;
    for(var i = 0; i < list.length; i++)
    {
        if(list[i].equals(moveToCheck)) return true;
    }
    return false;
}

function containsPiece(list,piece) {
    if(list === null || piece === null) return false;
    for(var i = 0; i < list.length; i++)
    {
        if(list[i].equals(piece)) return true;
    }
    return false;
}

function boardAfterMove(board,move)
{
    var res = [];

    if(!inRange(move.target.row,move.target.column)) return board;

    // copy board
    for(var i = 0; i < board.length; i++)
    {
        var row = [];
        for(var j = 0; j < board[i].length; j++)
        {
            row.push(board[i][j]);
        }
        res.push(row);
    }

    //update move
    res[move.source.row][move.source.column] = null;
    res[move.target.row][move.target.column] = move.piece;

    return res;
}
//</editor-fold>

//<editor-fold desc="Threats">
function isPieceThreatenedBy(piece,board,optionalThreats) {
    var myColor = piece.color;
    var res = false;

    for(var row = 0; row < board.length && !res; row++)
    {
        for(var col = 0; col < board[row].length && !res; col++)
        {
            if(board[row][col] !== null && !myColor.equals(board[row][col].color) && (optionalThreats === null || containsPiece(optionalThreats,board[row][col])))
            {
                switch(board[row][col].type)
                {
                    case Piece.Type.Pawn:   res = pawnThreats(Cell(row,col),board,piece); break;
                    case Piece.Type.Knight: res = knightThreats(Cell(row,col),board,piece); break;
                    case Piece.Type.Bishop: res = bishopThreats(Cell(row,col),board,piece); break;
                    case Piece.Type.Rook:   res = rookThreats(Cell(row,col),board,piece); break;
                    case Piece.Type.Queen:  res = queenThreats(Cell(row,col),board,piece); break;
                    case Piece.Type.King:   res = kingThreats(Cell(row,col),board,piece); break;
                }
            }
        }
    }

    return res;
}

function isPieceThreatened(piece,board) {
    return isPieceThreatenedBy(piece,board,null);
}

function pawnThreats(pawnCell, board, pieceToThreat)
{
    var forward = board[pawnCell.row][pawnCell.column].color.equals(Piece.Color.Black) ? -1 : 1;

    return (inRange(pawnCell.row + forward,pawnCell.column + 1) && board[pawnCell.row + forward][pawnCell.column + 1] === pieceToThreat) ||
        (inRange(pawnCell.row + forward,pawnCell.column - 1) && board[pawnCell.row + forward][pawnCell.column - 1] === pieceToThreat);
}

function knightThreats(knightCell, board, pieceToThreat)
{

    if(inRange(knightCell.row - 1,knightCell.column - 2) && board[knightCell.row - 1][knightCell.column - 2] === pieceToThreat) return true;
    else if(inRange(knightCell.row - 2,knightCell.column - 1) && board[knightCell.row - 2][knightCell.column - 1] === pieceToThreat) return true;
    else if(inRange(knightCell.row - 2,knightCell.column + 1) && board[knightCell.row - 2][knightCell.column + 1] === pieceToThreat) return true;
    else if(inRange(knightCell.row - 1,knightCell.column + 2) && board[knightCell.row - 1][knightCell.column + 2] === pieceToThreat) return true;
    else if(inRange(knightCell.row + 1,knightCell.column - 2) && board[knightCell.row + 1][knightCell.column - 2] === pieceToThreat) return true;
    else if(inRange(knightCell.row + 2,knightCell.column - 1) && board[knightCell.row + 2][knightCell.column - 1] === pieceToThreat) return true;
    else if(inRange(knightCell.row + 1,knightCell.column + 2) && board[knightCell.row + 1][knightCell.column + 2] === pieceToThreat) return true;
    else if(inRange(knightCell.row + 2,knightCell.column + 1) && board[knightCell.row + 2][knightCell.column + 1] === pieceToThreat) return true;

    return false;
}

function bishopThreats(bishopCell, board, pieceToThreat)
{
    // top-right diagonal
    for(var margin = 1; inRange(bishopCell.row + margin,bishopCell.column + margin); margin++)
    {
        if(board[bishopCell.row + margin][bishopCell.column + margin] === pieceToThreat) return true;
        if(board[bishopCell.row + margin][bishopCell.column + margin] !== null) break;
    }
    // top-left diagonal
    for(var margin = 1; inRange(bishopCell.row + margin,bishopCell.column - margin); margin++)
    {
        if(board[bishopCell.row + margin][bishopCell.column - margin] === pieceToThreat) return true;
        if(board[bishopCell.row + margin][bishopCell.column - margin] !== null) break;
    }
    // bottom-left diagonal
    for(var margin = -1; inRange(bishopCell.row + margin,bishopCell.column + margin); margin--)
    {
        if(board[bishopCell.row + margin][bishopCell.column + margin] === pieceToThreat) return true;
        if(board[bishopCell.row + margin][bishopCell.column + margin] !== null) break;
    }
    // bottom-right diagonal
    for(var margin = -1; inRange(bishopCell.row + margin,bishopCell.column - margin); margin--)
    {
        if(board[bishopCell.row + margin][bishopCell.column - margin] === pieceToThreat) return true;
        if(board[bishopCell.row + margin][bishopCell.column - margin] !== null) break;
    }

    return false;
}

function rookThreats(bishopCell, board, pieceToThreat)
{
    // bottom
    for(var row = bishopCell.row - 1; row >= 0; row--)
    {
        if(board[row][bishopCell.column] === pieceToThreat) return true;
        if(board[row][bishopCell.column] !== null) break;
    }
    // top
    for(var row = bishopCell.row + 1; row < 8; row++)
    {
        if(board[row][bishopCell.column] === pieceToThreat) return true;
        if(board[row][bishopCell.column] !== null) break;
    }
    // left
    for(var col = bishopCell.column - 1; col >= 0; col--)
    {
        if(board[bishopCell.row][col] === pieceToThreat) return true;
        if(board[bishopCell.row][col] !== null) break;
    }
    // right
    for(var col = bishopCell.column + 1; col < 8; col++)
    {
        if(board[bishopCell.row][col] === pieceToThreat) return true;
        if(board[bishopCell.row][col] !== null) break;
    }

    return false;
}

function kingThreats(kingCell, board, pieceToThreat)
{
    for(var row = kingCell.row - 1; row <= kingCell.row + 1; row++)
    {
        for(var col = kingCell.column - 1; col <= kingCell.column + 1; col++)
        {
            if(inRange(row,col) && (kingCell.row != row || kingCell.column != col) && board[row][col] === pieceToThreat) return true;
        }
    }

    return false;
}

function queenThreats(queenCell, board, pieceToThreat)
{
    // top-right diagonal
    for(var margin = 1; inRange(queenCell.row + margin,queenCell.column + margin); margin++)
    {
        if(board[queenCell.row + margin][queenCell.column + margin] === pieceToThreat) return true;
        if(board[queenCell.row + margin][queenCell.column + margin] !== null) break;
    }
    // top-left diagonal
    for(var margin = 1; inRange(queenCell.row + margin,queenCell.column - margin); margin++)
    {
        if(board[queenCell.row + margin][queenCell.column - margin] === pieceToThreat) return true;
        if(board[queenCell.row + margin][queenCell.column - margin] !== null) break;
    }
    // bottom-left diagonal
    for(var margin = -1; inRange(queenCell.row + margin,queenCell.column + margin); margin--)
    {
        if(board[queenCell.row + margin][queenCell.column + margin] === pieceToThreat) return true;
        if(board[queenCell.row + margin][queenCell.column + margin] !== null) break;
    }
    // bottom-right diagonal
    for(var margin = -1; inRange(queenCell.row + margin,queenCell.column - margin); margin--)
    {
        if(board[queenCell.row + margin][queenCell.column - margin] === pieceToThreat) return true;
        if(board[queenCell.row + margin][queenCell.column - margin] !== null) break;
    }

    // bottom
    for(var row = queenCell.row - 1; row >= 0; row--)
    {
        if(board[row][queenCell.column] === pieceToThreat) return true;
        if(board[row][queenCell.column] !== null) break;
    }
    // top
    for(var row = queenCell.row + 1; row < 8; row++)
    {
        if(board[row][queenCell.column] === pieceToThreat) return true;
        if(board[row][queenCell.column] !== null) break;
    }
    // left
    for(var col = queenCell.column - 1; col >= 0; col--)
    {
        if(board[queenCell.row][col] === pieceToThreat) return true;
        if(board[queenCell.row][col] !== null) break;
    }
    // right
    for(var col = queenCell.column + 1; col < 8; col++)
    {
        if(board[queenCell.row][col] === pieceToThreat) return true;
        if(board[queenCell.row][col] !== null) break;
    }

    return false;
}
//</editor-fold>

//<editor-fold desc="Castling">
bp.registerBThread("Castling",function ()
{
    var initState = bp.sync({waitFor:stateUpdate}).data;
    var board = initState.board;

    for(var i = 0; i < 2; i++)
    {
        var color = i == 0 ? Piece.Color.White : Piece.Color.Black;
        var king = null;
        var rooks = [];

        //scan for pieces
        for(var row = 0; row < board.length; row++)
        {
            for(var col = 0; col < board[row].length; col++)
            {
                if(board[row][col] != null && board[row][col].color.equals(color))
                {
                    if(board[row][col].type.equals(Piece.Type.King)) king = {piece:board[row][col],cell:Cell(row,col)};
                    else if(board[row][col].type.equals(Piece.Type.Rook)) rooks.push({piece:board[row][col],cell:Cell(row,col)});
                }
            }
        }

        // register threads
        for (var j = 0; j < rooks.length; j++){(function (j, king, rooks) {
        {
            // Rule: "Castling consists of moving the king two squares towards a rook, then placing the rook on the other side of the king, adjacent to it."
            bp.registerBThread("request " + king.piece + " , " + rooks[j].piece + " - Castling",function ()
            {
                var myKing = king.piece;
                var kingCell = king.cell;
                var myRook = rooks[j].piece;
                var rookCell = rooks[j].cell;

                while(true)
                {
                    // * The king and rook involved in castling must not have previously moved
                    var state = bp.sync({waitFor:stateUpdate, interrupt:[pieceMove(myKing),pieceMove(myRook),moveTo(kingCell),moveTo(rookCell)]}).data;

                    // * The king may not currently be in check
                    var reject = isPieceThreatened(myKing,state.board);
                    for(var i = kingCell.column + (kingCell.column < rookCell.column ? 1 : -1); !reject && (kingCell.column < rookCell.column ? i < rookCell.column : i > rookCell.column);(kingCell.column < rookCell.column ? i++ : i--))
                    {
                        // * There must be no pieces between the king and the rook
                        if(state.board[kingCell.row][i] !== null) reject = true;
                        else
                        {
                            // * The king may not pass through a square that is under attack by an enemy piece
                            reject = isPieceThreatened(myKing,boardAfterMove(state.board,Move(kingCell,Cell(kingCell.row,i),myKing)));
                        }
                    }

                    if(!reject)
                    {
                        var firstMove = Move(kingCell,Cell(kingCell.row,(kingCell.column < rookCell.column ? kingCell.column + 2 : kingCell.column - 2)),myKing);
                        var secondMove = Move(rookCell,Cell(rookCell.row,(kingCell.column < rookCell.column ? kingCell.column + 1 : kingCell.column - 1)),myRook);

                        // * The king may not end up in a square that is under attack by an enemy piece
                        if(!isPieceThreatened(myKing,boardAfterMove(boardAfterMove(state.board,firstMove),secondMove)))
                        {
                            var castling = Castling(firstMove.source,firstMove.target,firstMove.piece,secondMove.source,secondMove.target,secondMove.piece);
                            bp.sync({request: castling, waitFor:moves,interrupt:[pieceMove(myKing),pieceMove(myRook),moveTo(kingCell),moveTo(rookCell)]});
                        }
                    }
                }
            });
        }})(j,king,rooks);
        }
    }
});
//</editor-fold>

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
            bp.registerBThread(pawn + " Eat Movement", function()
            {
                var cell = initCell;
                var myPawn = pawn;

                while(true)
                {
                    var state = bp.sync({waitFor:stateUpdate, interrupt:moveTo(cell)}).data;

                    if(pieceMove(myPawn).contains(state.lastMove))
                    {
                        cell = state.lastMove.target;
                    }

                    var optionalMoves = pawnMoves(myPawn,cell,state.board);

                    bp.sync({request: optionalMoves, waitFor:moves,interrupt:moveTo(cell)});
                }
            });

            // Rule: "En passant - When a pawn advances two squares from its original square and ends the turn adjacent to a pawn of the opponent's on the same rank,
            // it may be captured by that pawn of the opponent's, as if it had moved only one square forward."
            // * This capture is only legal on the opponent's next move immediately following the first pawn's advance.
            bp.registerBThread(pawn + " en passant movement", function ()
            {
                var cell = initCell;
                var myPawn = pawn;

                while (true)
                {
                    var state = bp.sync({waitFor:stateUpdate, interrupt:moveTo(cell)}).data;

                    if(pieceMove(myPawn).contains(state.lastMove))
                    {
                        cell = state.lastMove.target;
                    }
                    else if(state.lastMove !== null && state.lastMove.piece.type.equals(Piece.Type.Pawn))
                    {
                        // check if pawn advances two squares and ends the turn adjacent on the same rank
                        if(Math.abs(state.lastMove.target.row - state.lastMove.source.row) === 2 && state.lastMove.target.row === cell.row && (state.lastMove.target.column === cell.column - 1 || state.lastMove.target.column === cell.column + 1))
                        {
                            var targetRow = state.lastMove.source.row < cell.row ? cell.row -1 : cell.row + 1;
                            var targetColumn = state.lastMove.target.column < cell.column ? cell.column -1 : cell.column + 1;

                            var enPassant = EnPassant(cell,Cell(targetRow,targetColumn),myPawn,state.lastMove.piece);
                            // * This capture is only legal on the opponent's next move immediately following the first pawn's advance.
                            var t = bp.EventSet("", function (e) {
                               return moves.contains(e) && e.piece.color.equals(myPawn.color) && !enPassantMove.contains(e);
                            });
                            bp.sync({request: enPassant, block: t, waitFor:moves,interrupt:moveTo(cell)});
                        }
                    }
                }
            });
        }
    }
});

function pawnMovesExcept(pawn,pawnCell,board,exceptGroup, normalMovesFlag)
{
    var optionalMoves = [];
    var myForward = pawn.color.equals(Piece.Color.Black) ? -1 : 1;

    // check in board if these cells has enemies - then eat
    if(inRange(pawnCell.row + myForward,pawnCell.column + 1) && board[pawnCell.row + myForward][pawnCell.column + 1] !== null && (exceptGroup === null || !containsMove(exceptGroup, Move(pawnCell, Cell(pawnCell.row + myForward, pawnCell.column + 1), pawn)))) optionalMoves.push(Move(pawnCell, Cell(pawnCell.row + myForward, pawnCell.column + 1), pawn));
    if(inRange(pawnCell.row + myForward,pawnCell.column - 1) && board[pawnCell.row + myForward][pawnCell.column - 1] !== null && (exceptGroup === null || !containsMove(exceptGroup, Move(pawnCell, Cell(pawnCell.row + myForward, pawnCell.column - 1), pawn)))) optionalMoves.push(Move(pawnCell, Cell(pawnCell.row + myForward, pawnCell.column - 1), pawn));

    if(normalMovesFlag)
    {
        if(inRange(pawnCell.row + myForward,pawnCell.column) && board[pawnCell.row + myForward][pawnCell.column] === null && (exceptGroup === null || !containsMove(exceptGroup, Move(pawnCell, Cell(pawnCell.row + myForward, pawnCell.column), pawn)))) optionalMoves.push(Move(pawnCell, Cell(pawnCell.row + myForward, pawnCell.column), pawn));
        if(inRange(pawnCell.row + myForward,pawnCell.column) && inRange(pawnCell.row + myForward*2,pawnCell.column) && board[pawnCell.row + myForward][pawnCell.column] === null && board[pawnCell.row + myForward*2][pawnCell.column] === null && (exceptGroup === null || !containsMove(exceptGroup,Move(pawnCell, Cell(pawnCell.row + myForward*2, pawnCell.column), pawn)))) optionalMoves.push(Move(pawnCell, Cell(pawnCell.row + myForward*2, pawnCell.column), pawn));
    }

    return optionalMoves;
}

function pawnMoves(pawn,pawnCell,board)
{
    return pawnMovesExcept(pawn,pawnCell,board,null,false);
}
//</editor-fold>

//<editor-fold desc="King Rules">
bp.registerBThread("king rules", function ()
{
    while (true)
    {
        var kingCreationEvent = bp.sync({waitFor:kingCreation}).data;

        var king = kingCreationEvent.piece;
        var initCell = kingCreationEvent.cell;

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

                    var optionalMoves = kingMoves(myKing,cell,state.board);

                    bp.sync({request: optionalMoves, waitFor:moves,interrupt:moveTo(cell)});
                }
            });
        }

        //Rule: "A king is in check when it is under attack by at least one enemy piece."
        bp.registerBThread("Detect " + king + " in CHECK",function () {
            var myKing = king;
            var cell = initCell;

            while(true)
            {
                var state = bp.sync({waitFor:stateUpdate}).data;

                if(pieceMove(myKing).contains(state.lastMove))
                {
                    cell = state.lastMove.target;
                }

                if(isPieceThreatened(myKing,state.board)) bp.sync({request: bp.Event("KingInCheckUpdate", {king:myKing,board:state.board}),block:moves});
            }
        });

        // Rule: "It is illegal to make a move that places or leaves one's king in check."
        bp.registerBThread("Block moves that places or leaves " + king + " in check",function () {

            var myKing = king;

            while (true)
            {
                var state = bp.sync({waitFor:stateUpdate}).data;
                var movesToBlock = [];

                for(var row = 0; row < state.board.length; row++)
                {
                    for(var col = 0; col < state.board[row].length; col++)
                    {
                        // king's team pieces
                        if(state.board[row][col] !== null && myKing.color.equals(state.board[row][col].color))
                        {
                            var myMoves;

                            // get optionalMoves
                            switch(state.board[row][col].type)
                            {
                                case Piece.Type.Pawn:   myMoves = pawnMovesExcept(state.board[row][col],Cell(row,col),state.board,null,true); break;
                                case Piece.Type.Knight: myMoves = knightMoves(state.board[row][col],Cell(row,col),state.board); break;
                                case Piece.Type.Bishop: myMoves = bishopMoves(state.board[row][col],Cell(row,col),state.board); break;
                                case Piece.Type.Rook:   myMoves = rookMoves(state.board[row][col],Cell(row,col),state.board); break;
                                case Piece.Type.Queen:  myMoves = queenMoves(state.board[row][col],Cell(row,col),state.board); break;
                                case Piece.Type.King:   myMoves = kingMoves(state.board[row][col],Cell(row,col),state.board); break;
                            }

                            // filter all moves that leaves one's king in check.
                            for(var i = 0; i < myMoves.length; i++)
                            {
                                if(isPieceThreatened(myKing,boardAfterMove(state.board,myMoves[i])))
                                {
                                    movesToBlock.push(myMoves[i]);
                                }
                            }
                        }

                    }
                }

                bp.sync({block:movesToBlock,waitFor:moves});
            }
        });

        // Rule: "If a player's king is placed in check and there is no legal move that player can make to escape check, then the king is said to be checkmated, the game ends.
        // (If it is not possible to get out of check, the king is checkmated and the game is over)"
        bp.registerBThread("Detect " + king + " in CheckMate",function(){

            var myKing = king;

           while (true)
           {
               var state = bp.sync({waitFor:stateUpdate}).data;
               var optionalMoves = [];

               for(var row = 0; row < state.board.length; row++)
               {
                   for(var col = 0; col < state.board[row].length; col++)
                   {
                       // king's team pieces
                       if(state.board[row][col] !== null && myKing.color.equals(state.board[row][col].color))
                       {
                           var myMoves;

                           // get optionalMoves
                           switch(state.board[row][col].type)
                           {
                               case Piece.Type.Pawn:   myMoves = pawnMovesExcept(state.board[row][col],Cell(row,col),state.board,null,true); break;
                               case Piece.Type.Knight: myMoves = knightMoves(state.board[row][col],Cell(row,col),state.board); break;
                               case Piece.Type.Bishop: myMoves = bishopMoves(state.board[row][col],Cell(row,col),state.board); break;
                               case Piece.Type.Rook:   myMoves = rookMoves(state.board[row][col],Cell(row,col),state.board); break;
                               case Piece.Type.Queen:  myMoves = queenMoves(state.board[row][col],Cell(row,col),state.board); break;
                               case Piece.Type.King:   myMoves = kingMoves(state.board[row][col],Cell(row,col),state.board); break;
                           }

                           // filter all moves that leaves one's king in check.
                           for(var i = 0; i < myMoves.length; i++)
                           {
                               if(!isPieceThreatened(myKing,boardAfterMove(state.board,myMoves[i])))
                               {
                                   if(!outBoundsMoves.contains(myMoves[i]) && (!(state.board[myMoves[i].target.row][myMoves[i].target.column] instanceof Piece) || !state.board[row][col].color.equals(state.board[myMoves[i].target.row][myMoves[i].target.column].color)))
                                   {
                                       optionalMoves.push(myMoves[i]);
                                   }
                               }
                           }
                       }

                   }
               }

               if(optionalMoves.length === 0)
               {
                   bp.sync({request:bp.Event("CheckMateState",{loser:myKing}),block:[moves,checkUpdate]});
                   //bp.log.info("Game Over - " + myKing + " has been Checkmated.");
                   bp.sync({block:moves});
               }
           }
        });
    }
});

function kingMovesExcept(king,kingCell,board,exceptGroup)
{
    var optionalMoves = [];

    for(var row = kingCell.row - 1; row <= kingCell.row + 1; row++)
    {
        for(var col = kingCell.column - 1; col <= kingCell.column + 1; col++)
        {
            if(inRange(row,col) && (kingCell.row != row || kingCell.column != col) && (exceptGroup === null || !containsMove(exceptGroup,Move(kingCell, Cell(row, col), king)))) optionalMoves.push(Move(kingCell, Cell(row, col), king));
        }
    }

    return optionalMoves;
}

function kingMoves(king,kingCell,board)
{
    return kingMovesExcept(king,kingCell,board,null);
}
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

                    var optionalMoves = knightMoves(myKnight,cell,state.board);

                    bp.sync({request: optionalMoves, waitFor:moves,interrupt:moveTo(cell)});
                }
            });
        }
    }
});

function knightMovesExcept(knight,knightCell,board,exceptGroup)
{
    var optionalMoves = [];

    if(exceptGroup === null || exceptGroup.indexOf(Move(knightCell, Cell(knightCell.row - 1, knightCell.column - 2), knight)) === -1) optionalMoves.push(Move(knightCell, Cell(knightCell.row - 1, knightCell.column - 2), knight));
    if(exceptGroup === null || exceptGroup.indexOf(Move(knightCell, Cell(knightCell.row - 2, knightCell.column - 1), knight)) === -1) optionalMoves.push(Move(knightCell, Cell(knightCell.row - 2, knightCell.column - 1), knight));
    if(exceptGroup === null || exceptGroup.indexOf(Move(knightCell, Cell(knightCell.row - 2, knightCell.column + 1), knight)) === -1) optionalMoves.push(Move(knightCell, Cell(knightCell.row - 2, knightCell.column + 1), knight));
    if(exceptGroup === null || exceptGroup.indexOf(Move(knightCell, Cell(knightCell.row - 1, knightCell.column + 2), knight)) === -1) optionalMoves.push(Move(knightCell, Cell(knightCell.row - 1, knightCell.column + 2), knight));
    if(exceptGroup === null || exceptGroup.indexOf(Move(knightCell, Cell(knightCell.row + 1, knightCell.column - 2), knight)) === -1) optionalMoves.push(Move(knightCell, Cell(knightCell.row + 1, knightCell.column - 2), knight));
    if(exceptGroup === null || exceptGroup.indexOf(Move(knightCell, Cell(knightCell.row + 2, knightCell.column - 1), knight)) === -1) optionalMoves.push(Move(knightCell, Cell(knightCell.row + 2, knightCell.column - 1), knight));
    if(exceptGroup === null || exceptGroup.indexOf(Move(knightCell, Cell(knightCell.row + 1, knightCell.column + 2), knight)) === -1) optionalMoves.push(Move(knightCell, Cell(knightCell.row + 1, knightCell.column + 2), knight));
    if(exceptGroup === null || exceptGroup.indexOf(Move(knightCell, Cell(knightCell.row + 2, knightCell.column + 1), knight)) === -1) optionalMoves.push(Move(knightCell, Cell(knightCell.row + 2, knightCell.column + 1), knight));

    return optionalMoves;
}

function knightMoves(knight,knightCell,board)
{
    return knightMovesExcept(knight,knightCell,board,null);
}
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

                    var optionalMoves = rookMoves(myRook,cell,state.board);

                    bp.sync({request: optionalMoves, waitFor:moves,interrupt:moveTo(cell)});
                }
            });
        }
    }
});

function rookMovesExcept(rook,rookCell,board,exceptGroup)
{
    var optionalMoves = [];

    // bottom
    for(var row = rookCell.row - 1; row >= 0; row--)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(rookCell, Cell(row, rookCell.column), rook))) optionalMoves.push(Move(rookCell, Cell(row, rookCell.column), rook));
        if(board[row][rookCell.column] !== null) break;
    }
    // top
    for(var row = rookCell.row + 1; row < 8; row++)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(rookCell, Cell(row, rookCell.column), rook))) optionalMoves.push(Move(rookCell, Cell(row, rookCell.column), rook));
        if(board[row][rookCell.column] !== null) break;
    }
    // left
    for(var col = rookCell.column - 1; col >= 0; col--)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(rookCell, Cell(rookCell.row, col), rook))) optionalMoves.push(Move(rookCell, Cell(rookCell.row, col), rook));
        if(board[rookCell.row][col] !== null) break;
    }
    // right
    for(var col = rookCell.column + 1; col < 8; col++)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(rookCell, Cell(rookCell.row, col), rook))) optionalMoves.push(Move(rookCell, Cell(rookCell.row, col), rook));
        if(board[rookCell.row][col] !== null) break;
    }

    //if(exceptGroup !== null) bp.log.info("try Except: " + rook + " in " + rookCell +" | group: " + exceptGroup + " | Final Except: " + optionalMoves);

    return optionalMoves;
}

function rookMoves(rook,rookCell,board)
{
    return rookMovesExcept(rook,rookCell,board,null);
}
//</editor-fold>

//<editor-fold desc="Bishop Rules">
bp.registerBThread("bishop rules", function () {
    while (true) {
        var bishopCreationEvent = bp.sync({waitFor: bishopCreation}).data;

        var bishop = bishopCreationEvent.piece;
        var initCell = bishopCreationEvent.cell;

        if (autoMovesBlack && (bishop.color.equals(Piece.Color.Black)) || (autoMovesWhite && bishop.color.equals(Piece.Color.White)))
        {
            // Rule: "A bishop moves any number of vacant squares diagonally."
            bp.registerBThread(bishop + " Movement", function () {
                var cell = initCell;
                var myBishop = bishop;

                while (true)
                {
                    var state = bp.sync({waitFor: stateUpdate, interrupt: moveTo(cell)}).data;

                    if (pieceMove(myBishop).contains(state.lastMove))
                    {
                        cell = state.lastMove.target;
                    }

                    var optionalMoves = bishopMoves(myBishop,cell,state.board);

                    bp.sync({request: optionalMoves, waitFor:moves,interrupt:moveTo(cell)});
                }
            });
        }
    }
});

function bishopMovesExcept(bishop,bishopCell,board,exceptGroup)
{
    var optionalMoves = [];

    // top-right diagonal
    for(var margin = 1; inRange(bishopCell.row + margin,bishopCell.column + margin); margin++)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(bishopCell, Cell(bishopCell.row + margin, bishopCell.column + margin), bishop))) optionalMoves.push(Move(bishopCell, Cell(bishopCell.row + margin, bishopCell.column + margin), bishop));
        if(board[bishopCell.row + margin][bishopCell.column + margin] !== null) break;
    }
    // top-left diagonal
    for(var margin = 1; inRange(bishopCell.row + margin,bishopCell.column - margin); margin++)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(bishopCell, Cell(bishopCell.row + margin, bishopCell.column - margin), bishop))) optionalMoves.push(Move(bishopCell, Cell(bishopCell.row + margin, bishopCell.column - margin), bishop));
        if(board[bishopCell.row + margin][bishopCell.column - margin] !== null) break;
    }
    // bottom-left diagonal
    for(var margin = -1; inRange(bishopCell.row + margin,bishopCell.column + margin); margin--)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(bishopCell, Cell(bishopCell.row + margin, bishopCell.column + margin), bishop))) optionalMoves.push(Move(bishopCell, Cell(bishopCell.row + margin, bishopCell.column + margin), bishop));
        if(board[bishopCell.row + margin][bishopCell.column + margin] !== null) break;
    }
    // bottom-right diagonal
    for(var margin = -1; inRange(bishopCell.row + margin,bishopCell.column - margin); margin--)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(bishopCell, Cell(bishopCell.row + margin, bishopCell.column - margin), bishop))) optionalMoves.push(Move(bishopCell, Cell(bishopCell.row + margin, bishopCell.column - margin), bishop));
        if(board[bishopCell.row + margin][bishopCell.column - margin] !== null) break;
    }

    return optionalMoves;
}

function bishopMoves(bishop,bishopCell,board)
{
    return bishopMovesExcept(bishop,bishopCell,board,null);
}
//</editor-fold>

//<editor-fold desc="Queen Rules">
bp.registerBThread("queen rules", function () {
    while (true)
    {
        var queenCreationEvent = bp.sync({waitFor: queenCreation}).data;

        var queen = queenCreationEvent.piece;
        var initCell = queenCreationEvent.cell;

        if (autoMovesBlack && (queen.color.equals(Piece.Color.Black)) || (autoMovesWhite && queen.color.equals(Piece.Color.White)))
        {
            // Rule: "The queen moves any number of vacant squares horizontally, vertically, or diagonally."
            bp.registerBThread(queen + " Movement", function () {
                var cell = initCell;
                var myQueen = queen;

                while (true)
                {
                    var state = bp.sync({waitFor: stateUpdate, interrupt: moveTo(cell)}).data;

                    if (pieceMove(myQueen).contains(state.lastMove))
                    {
                        cell = state.lastMove.target;
                    }

                    var optionalMoves = queenMoves(myQueen,cell,state.board);

                    bp.sync({request: optionalMoves, waitFor:moves,interrupt:moveTo(cell)});
                }
            });
        }
    }
});

function queenMovesExcept(queen,queenCell,board,exceptGroup)
{
    var optionalMoves = [];

    // bottom
    for(var row = queenCell.row - 1; row >= 0; row--)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(queenCell, Cell(row, queenCell.column), queen))) optionalMoves.push(Move(queenCell, Cell(row, queenCell.column), queen));
        if(board[row][queenCell.column] !== null) break;
    }
    // top
    for(var row = queenCell.row + 1; row < 8; row++)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(queenCell, Cell(row, queenCell.column), queen))) optionalMoves.push(Move(queenCell, Cell(row, queenCell.column), queen));
        if(board[row][queenCell.column] !== null) break;
    }
    // left
    for(var col = queenCell.column - 1; col >= 0; col--)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(queenCell, Cell(queenCell.row, col), queen))) optionalMoves.push(Move(queenCell, Cell(queenCell.row, col), queen));
        if(board[queenCell.row][col] !== null) break;
    }
    // right
    for(var col = queenCell.column + 1; col < 8; col++)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(queenCell, Cell(queenCell.row, col), queen))) optionalMoves.push(Move(queenCell, Cell(queenCell.row, col), queen));
        if(board[queenCell.row][col] !== null) break;
    }

    // top-right diagonal
    for(var margin = 1; inRange(queenCell.row + margin,queenCell.column + margin); margin++)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(queenCell, Cell(queenCell.row + margin, queenCell.column + margin), queen))) optionalMoves.push(Move(queenCell, Cell(queenCell.row + margin, queenCell.column + margin), queen));
        if(board[queenCell.row + margin][queenCell.column + margin] !== null) break;
    }
    // top-left diagonal
    for(var margin = 1; inRange(queenCell.row + margin,queenCell.column - margin); margin++)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(queenCell, Cell(queenCell.row + margin, queenCell.column - margin), queen))) optionalMoves.push(Move(queenCell, Cell(queenCell.row + margin, queenCell.column - margin), queen));
        if(board[queenCell.row + margin][queenCell.column - margin] !== null) break;
    }
    // bottom-left diagonal
    for(var margin = -1; inRange(queenCell.row + margin,queenCell.column + margin); margin--)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(queenCell, Cell(queenCell.row + margin, queenCell.column + margin), queen))) optionalMoves.push(Move(queenCell, Cell(queenCell.row + margin, queenCell.column + margin), queen));
        if(board[queenCell.row + margin][queenCell.column + margin] !== null) break;
    }
    // bottom-right diagonal
    for(var margin = -1; inRange(queenCell.row + margin,queenCell.column - margin); margin--)
    {
        if(exceptGroup === null || !containsMove(exceptGroup,Move(queenCell, Cell(queenCell.row + margin, queenCell.column - margin), queen))) optionalMoves.push(Move(queenCell, Cell(queenCell.row + margin, queenCell.column - margin), queen));
        if(board[queenCell.row + margin][queenCell.column - margin] !== null) break;
    }

    //if(exceptGroup !== null) bp.log.info("try Except: " + queen + " in " + queenCell +" | group: " + exceptGroup + " | Final Except: " + optionalMoves);

    return optionalMoves;
}

function queenMoves(queen,queenCell,board)
{
    return queenMovesExcept(queen,queenCell,board,null);
}
//</editor-fold>