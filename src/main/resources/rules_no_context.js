var pieceCreation = bp.EventSet("Create", function (e) {
    return e.name.equals("Create");
});

function pieceCreationInCell(cell) {
    return bp.EventSet("Create", function (e) {
        return e.name.equals("Create") && e.data.cell.equals(cell);
    });
}

var pawnCreation = bp.EventSet("Create", function (e) {
    return (e.name.equals("Create") && e.data.piece.type.equals(Piece.Type.Pawn));
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
        for(j = 0 ; j < 8; j++) {
            var cell = Cell(i,j);
            bp.registerBThread("don't move to a cell with the same color " + cell, function() {
                var piece = null;
                var e;
                while(true) {
                    if(piece === null) {
                        e = bp.sync({waitFor: [moveTo(cell), pieceCreationInCell(cell)]});
                    } else {
                        e = bp.sync({waitFor: moveTo(cell), block: moveToWithColor(cell, piece.color)});
                    }
                    piece = e.piece;
                }
            });
        }
    }
}

cellRules();
//endregion

//region pawn
bp.registerBThread("pawn rules", function(){
    var pawnCreation = bp.sync({waitFor:pawnCreation}).data;
    var piece = pawnCreation.piece;
    var initCell = pawnCreation.cell;
    var forward = piece.color.equals(Piece.Color.Black) ? -1 : 1;

    bp.registerBThread("move pawn one forward " + piece, function() {
        var cell = initCell;
        while(true) {
            var nextCell = Cell(cell.row + forward, cell.col);
            bp.sync({ request: Move(cell, nextCell) });
            cell = nextCell;
        }
    });

    bp.registerBThread("pawn eat " + piece, function() {
        var cell = initCell;
        while(true) {
            var nextCell = Cell(cell.row + forward, cell.col);
            bp.sync({ request: Move(cell, nextCell) });
            cell = nextCell;
        }
    });

    bp.registerBThread("move pawn two " + piece, function() {
        var cell = initCell;
        bp.sync({
            request: Move(cell, Cell(cell.row + forward*2, cell.col)),
            interrupt: pieceMove(piece)
        });
    });

    bp.registerBThread("move pawn one diagonal " + piece, function() {
        var cell = initCell;
        while(true) {
            var nextCell1 = Cell(cell.row + forward, cell.col + 1);
            var nextCell2 = Cell(cell.row + forward, cell.col - 1);
            var e = bp.sync({ request: [Move(cell, nextCell1, piece), Move(cell, nextCell2, piece)],
                waitFor: pieceMove(piece)});
            cell = e.target;
        }
    });

    function pawnCellRules() {
        var i,j;
        for(i = 0 ; i < 8; i++) {
            for(j = 0 ; j < 8; j++) {
                var cell = Cell(i,j);
                bp.registerBThread("pawn don't eat empty cells: " + pawn+", "+cell, function() {
                    var piece = null;
                    var m;
                    while(true) {
                        if(piece === null) {
                            m = bp.sync({
                                waitFor: [moveTo(cell), pieceCreationInCell(cell)],
                                block: moveToWithPiece(cell,piece)
                            }).data;
                            piece = m.piece;
                        } else {
                            m = bp.sync({waitFor: [moveFrom(cell), moveTo(cell)]});
                            piece = (m.target.equals(cell))  ? m.piece : null;
                        }
                    }
                });
            }
        }
    }

    pawnCellRules();
});

//endregion