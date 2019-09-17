
var autoMovesBlack = true;
var autoMovesWhite = true;

//<editor-fold desc="Global Events and Sets">

//<editor-fold desc="Creation Functions And Sets">
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

function startTurnEvent(piece) {
    return bp.Event(piece.color + " Turn");
}
//</editor-fold>

//</editor-fold>

//<editor-fold desc="General Rules">
bp.registerBThread("EnforceTurns",function () {
    while (true)
    {
        bp.sync({waitFor:whiteMoves,block:blackMoves});
        //bp.log.info("White move found, waiting for black");
        bp.sync({waitFor:blackMoves,block:whiteMoves});
        //bp.log.info("Black move found, waiting for white");
    }
});

bp.registerBThread("Movement in bounds",function () {
   while (true)
   {
       bp.sync({block:outBoundsMoves});
   }
});

bp.registerBThread("don't move if eaten ", function() {
    while(true) {
        var pieceCreation = bp.sync({waitFor: pieceCreation}).data;
        var piece = pieceCreation.piece;
        var initCell = pieceCreation.cell;

        bp.registerBThread("don't move if eaten " + piece, function() {
            var cell = initCell;
            while(true) {
                var e = bp.sync({waitFor: [pieceMove(piece), moveTo(cell)] });
                if(e.target.equals(cell)) {
                    bp.sync({block:pieceMove(piece)});
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
                        //bp.log.info("Enter to " + cell + " | E: " + e);
                        e = bp.sync({waitFor: [moveTo(cell), pieceCreationInCell(cell)]});

                        if(e instanceof Move) piece = e.piece;
                        else piece = e.data.piece;
                    }
                    else
                    {
                        //bp.log.info("Blocking move to " + cell + " | Piece in cell: " + piece);
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
//</editor-fold>


//<editor-fold desc="Pawn Rules">
bp.registerBThread("pawn rules", function(){
    while (true)
    {
        //bp.log.info("WaitFor Creation");
        var pawnCreationEvent = bp.sync({waitFor:pawnCreation}).data;
        //bp.log.info("Creating rules for: " + pawnCreationEvent.piece);

        var pawn = pawnCreationEvent.piece;
        var initCell = pawnCreationEvent.cell;
        var forward = pawn.color.equals(Piece.Color.Black) ? -1 : 1;
        var colorGroup = pawn.color.equals(Piece.Color.White) ? whiteMoves : blackMoves;

        if(autoMovesBlack && (pawn.color.equals(Piece.Color.Black)) || (autoMovesWhite && pawn.color.equals(Piece.Color.White)))
        {
            bp.registerBThread("move " + pawn + " one forward ", function() {
                var cell = initCell;
                var myPawn = pawn;
                var myForward = forward;
                var myColorGroup = colorGroup;

                while(true) {
                    //bp.log.info(myPawn + " is Waiting for: " + startTurn);
                    bp.sync({waitFor:startTurnEvent(myPawn), interrupt:moveTo(cell)}); // wait for turn and kill if piece eaten

                    var nextCell = Cell(cell.row + myForward, cell.column);
                    var myMove = Move(cell, nextCell, myPawn);

                    var moveEvent = bp.sync({ request: myMove, waitFor: myColorGroup});
                    if(pieceMove(myPawn).contains(moveEvent))
                    {
                        cell = moveEvent.target;
                    }
                }
            });

            bp.registerBThread("move " + pawn + " two forward", function()
            {
                var cell = initCell;
                var myPawn = pawn;
                var myForward = forward;
                var myColorGroup = colorGroup;

                while (true)
                {
                    //bp.log.info(myPawn + " waiting start, interrupt from: " + cell);
                    bp.sync({waitFor:startTurnEvent(myPawn), interrupt:moveTo(cell)}); // wait for turn and kill if piece eaten
                    //bp.log.info(myPawn + " request double move, interrupt from: " + myPawn);
                    bp.sync({
                        request: Move(cell, Cell(cell.row + myForward*2, cell.column),myPawn),
                        waitFor: myColorGroup,
                        interrupt: pieceMove(myPawn)
                    });
                }
            });

            /*bp.registerBThread("pawn eat " + piece, function() {
                var cell = initCell;
                while(true) {
                    var nextCell = Cell(cell.row + forward, cell.col);
                    bp.sync({ request: Move(cell, nextCell) });
                    cell = nextCell;
                }
            });*/

            bp.registerBThread(pawn + " Eat Movement", function() {
                var cell = initCell;
                var myPawn = pawn;
                var myColorGroup = colorGroup;
                var myForward = forward;

                while(true) {

                    bp.sync({waitFor:startTurnEvent(myPawn), interrupt:moveTo(cell)}); // wait for turn and kill if piece eaten

                    var nextCell1 = Cell(cell.row + myForward, cell.column + 1);
                    var nextCell2 = Cell(cell.row + myForward, cell.column - 1);

                    var moveEvent = bp.sync({ request: [Move(cell, nextCell1, myPawn), Move(cell, nextCell2, myPawn)],
                        waitFor: myColorGroup});
                    if(pieceMove(myPawn).contains(moveEvent))
                    {
                        cell = moveEvent.target;
                    }
                }
            });
        }

        function pawnCellRules() {
            var i,j;
            for(i = 0 ; i < 8; i++) {
                for(j = 0 ; j < 8; j++) {(function (i,j) {
                    var cell = Cell(i,j);

                    bp.registerBThread(pawn + " can move only to empty " + cell,function () {
                        var pawnRow = initCell.row;
                        var pawnColumn = initCell.column;
                        var myPawn = pawn;
                        var piece = null;
                        var myForward = forward;
                        var moveEvent;
                        var nextCell1;
                        var nextCell2;

                        while (true)
                        {
                            nextCell1 = Cell(pawnRow + myForward, pawnColumn);
                            nextCell2 = Cell(pawnRow + 2 * myForward, pawnColumn);
                            if(piece !== null && (cell.equals(nextCell1) || cell.equals(nextCell2)))
                            {
                                moveEvent = bp.sync({waitFor: [moveFrom(cell), moveTo(cell),pieceMove(myPawn)],
                                    block: moveToWithPiece(cell,myPawn)});

                                // track pawn location
                                if(pieceMove(myPawn).contains(moveEvent))
                                {
                                    pawnRow = moveEvent.target.row;
                                    pawnColumn = moveEvent.target.column;
                                }

                                if(moveFrom(cell).contains(moveEvent) || moveTo(cell).contains(moveEvent)) piece = (moveEvent.target.equals(cell)) ? moveEvent.piece : null;
                            }
                            else
                            {
                                moveEvent = bp.sync({
                                    waitFor: [moveFrom(cell),moveTo(cell), pieceCreationInCell(cell),pieceMove(myPawn)]
                                });

                                // track pawn location
                                if(pieceMove(myPawn).contains(moveEvent))
                                {
                                    pawnRow = moveEvent.target.row;
                                    pawnColumn = moveEvent.target.column;
                                }

                                if(moveFrom(cell).contains(moveEvent) || moveTo(cell).contains(moveEvent)) piece = (moveEvent.target.equals(cell)) ? moveEvent.piece : null;
                                else if(!pieceMove(myPawn).contains(moveEvent)) piece = moveEvent.data.piece;
                                //bp.log.info(cell + " is occupied by: " + piece);
                            }
                        }
                    });

                    bp.registerBThread(pawn + " don't eat empty " + cell, function() {
                        var pawnRow = initCell.row;
                        var pawnColumn = initCell.column;
                        var myPawn = pawn;
                        var myForward = forward;
                        var piece = null;
                        var moveEvent;
                        var nextCell1;
                        var nextCell2;

                        while(true) {
                            nextCell1 = Cell(pawnRow + myForward, pawnColumn + 1);
                            nextCell2 = Cell(pawnRow + myForward, pawnColumn - 1);
                            //bp.log.info(cell + " is occupied by: " + piece + " | tracking " + myPawn + " at: [row=" + pawnRow + ", col=" + pawnColumn + "]");
                            if(piece === null && (cell.equals(nextCell1) || cell.equals(nextCell2))) {
                                //bp.log.info(cell + " is empty waiting for move and blocking " + myPawn + " [" + pawnRow + "," + pawnColumn + "] moving to this cell");
                                moveEvent = bp.sync({
                                    waitFor: [moveTo(cell), pieceCreationInCell(cell),pieceMove(myPawn)],
                                    block: moveToWithPiece(cell,myPawn)
                                });

                                // track pawn location
                                if(pieceMove(myPawn).contains(moveEvent))
                                {
                                    pawnRow = moveEvent.target.row;
                                    pawnColumn = moveEvent.target.column;
                                }

                                if(moveTo(cell).contains(moveEvent)) piece = moveEvent.piece;
                                else if(!pieceMove(myPawn).contains(moveEvent)) piece = moveEvent.data.piece;
                                //bp.log.info(cell + " is occupied by: " + piece);

                            } else {
                                //bp.log.info(cell + " occupied by " + piece + " movement allowed to: " + myPawn);
                                moveEvent = bp.sync({waitFor: [moveFrom(cell), pieceCreationInCell(cell), moveTo(cell),pieceMove(myPawn)]});

                                // track pawn location
                                if(pieceMove(myPawn).contains(moveEvent))
                                {
                                    pawnRow = moveEvent.target.row;
                                    pawnColumn = moveEvent.target.column;
                                }

                                if(moveFrom(cell).contains(moveEvent) || moveTo(cell).contains(moveEvent)) piece = (moveEvent.target.equals(cell)) ? moveEvent.piece : null;
                                else if(!pieceMove(myPawn).contains(moveEvent)) piece = moveEvent.data.piece;
                            }
                        }
                    });
                })(i,j);
                }
            }
        }

        pawnCellRules();
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
        var colorGroup = king.color.equals(Piece.Color.White) ? whiteMoves : blackMoves;
        var otherColor = king.color.equals(Piece.Color.White) ? Piece.Color.Black : Piece.Color.White;

        if(autoMovesBlack && (king.color.equals(Piece.Color.Black)) || (autoMovesWhite && king.color.equals(Piece.Color.White)))
        {
            bp.registerBThread(king + " Movement", function() {
                var cell = initCell;
                var myKing = king;
                var myColorGroup = colorGroup;

                while(true)
                {
                    bp.sync({waitFor:startTurnEvent(myKing), interrupt:moveTo(cell)}); // wait for turn and kill if piece eaten

                    var optionalMoves = [];
                    for(var row = cell.row - 1; row <= cell.row + 1; row++)
                    {
                        for(var col = cell.column - 1; col <= cell.column + 1; col++)
                        {
                            if(cell.row != row || cell.column != col) optionalMoves.push(Move(cell, Cell(row, col), myKing));
                        }
                    }

                    //bp.log.info("M: " + optionalMoves);
                    var moveEvent = bp.sync({ request: optionalMoves, waitFor: myColorGroup});
                    if(pieceMove(myKing).contains(moveEvent))
                    {
                        cell = moveEvent.target;
                    }
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
                    bp.sync({request: bp.Event("Game Over - " + otherColorGroup + " Wins")});
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
        var colorGroup = knight.color.equals(Piece.Color.White) ? whiteMoves : blackMoves;

        if(autoMovesBlack && (knight.color.equals(Piece.Color.Black)) || (autoMovesWhite && knight.color.equals(Piece.Color.White)))
        {
            bp.registerBThread(knight + " Movement", function() {
                var cell = initCell;
                var myKnight = knight;
                var myColorGroup = colorGroup;

                while(true)
                {
                    bp.sync({waitFor:startTurnEvent(myKnight), interrupt:moveTo(cell)}); // wait for turn and kill if piece eaten

                    var optionalMoves = [];
                    optionalMoves.push(Move(cell, Cell(cell.row - 1, cell.column - 2), myKnight));
                    optionalMoves.push(Move(cell, Cell(cell.row - 2, cell.column - 1), myKnight));
                    optionalMoves.push(Move(cell, Cell(cell.row - 2, cell.column + 1), myKnight));
                    optionalMoves.push(Move(cell, Cell(cell.row - 1, cell.column + 2), myKnight));
                    optionalMoves.push(Move(cell, Cell(cell.row + 1, cell.column - 2), myKnight));
                    optionalMoves.push(Move(cell, Cell(cell.row + 2, cell.column - 1), myKnight));
                    optionalMoves.push(Move(cell, Cell(cell.row + 1, cell.column + 2), myKnight));
                    optionalMoves.push(Move(cell, Cell(cell.row + 2, cell.column + 1), myKnight));


                    //bp.log.info("M: " + optionalMoves);
                    var moveEvent = bp.sync({ request: optionalMoves, waitFor: myColorGroup});
                    if(pieceMove(myKnight).contains(moveEvent))
                    {
                        cell = moveEvent.target;
                    }
                }
            });
        }
    }
});
//</editor-fold>
