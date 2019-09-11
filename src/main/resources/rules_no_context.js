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

var autoMovesBlack = true;
var autoMovesWhite = false;

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
        var myColorGroup = pawn.color.equals(Piece.Color.White) ? whiteMoves : blackMoves;
        var otherColor = pawn.color.equals(Piece.Color.White) ? Piece.Color.Black : Piece.Color.White;
        var startTurnEvent = pawn.color.equals(Piece.Color.White) ? bp.Event("White Turn") : bp.Event("Black Turn");

        if(autoMovesBlack && (pawn.color.equals(Piece.Color.Black)) || (autoMovesWhite && pawn.color.equals(Piece.Color.White)))
        {
            bp.registerBThread("move " + pawn + " one forward ", function() {
                var cell = initCell;
                while(true) {

                    bp.sync({waitFor:startTurnEvent, interrupt:moveToWithColor(cell,otherColor)}); // wait for turn and kill if piece eaten

                    var nextCell = Cell(cell.row + forward, cell.col);
                    var myMove = Move(cell, nextCell, pawn);

                    var moveEvent = bp.sync({ request: myMove, waitFor: myColorGroup});
                    if(pieceMove(pawn).contains(moveEvent))
                    {
                        cell = moveEvent.target;
                    }
                }
            });

            bp.registerBThread("move " + pawn + " two forward", function()
            {
                var cell = initCell;

                bp.sync({waitFor:startTurnEvent, interrupt:moveToWithColor(cell,otherColor)}); // wait for turn and kill if piece eaten

                bp.sync({
                    request: Move(cell, Cell(cell.row + forward*2, cell.col)),
                    interrupt: pieceMove(piece)
                });
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
                while(true) {

                    bp.sync({waitFor:startTurnEvent, interrupt:moveToWithColor(cell,otherColor)}); // wait for turn and kill if piece eaten

                    var nextCell1 = Cell(cell.row + forward, cell.col + 1);
                    var nextCell2 = Cell(cell.row + forward, cell.col - 1);

                    var moveEvent = bp.sync({ request: [Move(cell, nextCell1, piece), Move(cell, nextCell2, piece)],
                        waitFor: myColorGroup});
                    if(pieceMove(pawn).contains(moveEvent))
                    {
                        cell = moveEvent.target;
                    }
                }
            });
        }

        function pawnCellRules() {
            var i,j;
            for(i = 0 ; i < 8; i++) {
                for(j = 0 ; j < 8; j++) {
                    var cell = Cell(i,j);
                    bp.registerBThread(pawn + " don't eat empty " + cell, function() {
                        var piece = null;
                        var moveEvent;
                        while(true) {
                            if(piece === null) {
                                moveEvent = bp.sync({
                                    waitFor: [moveTo(cell), pieceCreationInCell(cell)],
                                    block: moveToWithPiece(cell,pawn)
                                });

                                if(moveEvent instanceof Move) piece = moveEvent.piece;
                                else piece = moveEvent.data.piece;

                            } else {
                                moveEvent = bp.sync({waitFor: [moveFrom(cell), moveTo(cell)]});
                                piece = (moveEvent.target.equals(cell)) ? moveEvent.piece : null;
                            }
                        }
                    });
                }
            }
        }

        pawnCellRules();
    }
});

//endregion