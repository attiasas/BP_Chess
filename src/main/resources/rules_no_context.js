var pieceCreation = bp.EventSet("Create", function (e) {
    return e.name.equals("Create");
});

function pieceCreationInCell(cell) {
    return bp.EventSet("Create", function (e) {
        return e.name.equals("Create") && e.data.cell.equals(cell);
    });
}

var pawnCreation = bp.EventSet("Create Pawns", function (e) {
    return e.name.equals("Create") && e.data.piece.type.equals(Piece.Type.Pawn);
});

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

function moveToFrom(from, to) {
    return bp.EventSet("", function (e) {
        return (e instanceof Move) && e.source.equals(from) && e.target.equals(to);
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

var moves = bp.EventSet("Game Moves", function (e) {
    return (e instanceof Move);
});

var whiteMoves = bp.EventSet("White Moves",function (e) {
    return (e instanceof Move) && (e.piece !== null) && (Piece.Color.White.equals(e.piece.color));
});

var blackMoves = bp.EventSet("black Moves",function (e) {
    return (e instanceof Move) && (e.piece !== null) && (Piece.Color.Black.equals(e.piece.color));
});

var outBoundsMoves = bp.EventSet("",function (e) {
   return moves.contains(e) && (e.source.row < 0 || e.source.row > 7 || e.source.column < 0 || e.source.column > 7 || e.target.row < 0 || e.target.row > 7 || e.target.column < 0 || e.target.column > 7);
});

var autoMovesBlack = true;
var autoMovesWhite = true;

//region general
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
                    if(piece === null) {
                        e = bp.sync({waitFor: [moveTo(cell), pieceCreationInCell(cell)]});
                        //bp.log.info("Enter to " + cell + " | E: " + e);
                    } else {
                        //bp.log.info("Blocking move to " + cell + " | Piece in cell: " + piece);
                        e = bp.sync({waitFor: moveTo(cell), block: moveToWithColor(cell, piece.color)});
                    }
                    //bp.log.info("Before: Cell " + cell + " Rules - piece: " + piece);
                    if(e instanceof Move) piece = e.piece;
                    else piece = e.data.piece;
                    //bp.log.info("After: Cell " + cell + " Rules - piece: " + piece);
                }
            });
        })(i,j);
        }
    }
}

cellRules();
//endregion

//region pawn
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
        var startTurnEvent = pawn.color.equals(Piece.Color.White) ? bp.Event("White Turn") : bp.Event("Black Turn");

        if(autoMovesBlack && (pawn.color.equals(Piece.Color.Black)) || (autoMovesWhite && pawn.color.equals(Piece.Color.White)))
        {
            bp.registerBThread("move " + pawn + " one forward ", function() {
                var cell = initCell;
                var myPawn = pawn;
                var startTurn = startTurnEvent;
                var myForward = forward;
                var myColorGroup = colorGroup;

                while(true) {
                    bp.log.info(myPawn + " is Waiting for: " + startTurn);
                    bp.sync({waitFor:startTurn, interrupt:moveTo(cell)}); // wait for turn and kill if piece eaten

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
                var startTurn = startTurnEvent;
                var myColorGroup = colorGroup;

                while (true)
                {
                    //bp.log.info(myPawn + " waiting start, interrupt from: " + cell);
                    bp.sync({waitFor:startTurn, interrupt:moveTo(cell)}); // wait for turn and kill if piece eaten
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
                var startTurn = startTurnEvent;
                var myColorGroup = colorGroup;
                var myForward = forward;

                while(true) {

                    bp.sync({waitFor:startTurn, interrupt:moveTo(cell)}); // wait for turn and kill if piece eaten

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
                                    waitFor: [moveTo(cell), pieceCreationInCell(cell),pieceMove(myPawn)]
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
                                bp.log.info(cell + " is empty waiting for move and blocking " + myPawn + " [" + pawnRow + "," + pawnColumn + "] moving to this cell");
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
                                moveEvent = bp.sync({waitFor: [moveFrom(cell), moveTo(cell),pieceMove(myPawn)]});

                                // track pawn location
                                if(pieceMove(myPawn).contains(moveEvent))
                                {
                                    pawnRow = moveEvent.target.row;
                                    pawnColumn = moveEvent.target.column;
                                }

                                if(moveFrom(cell).contains(moveEvent) || moveTo(cell).contains(moveEvent)) piece = (moveEvent.target.equals(cell)) ? moveEvent.piece : null;
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

//endregion