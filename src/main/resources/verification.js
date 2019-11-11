bp.registerBThread("move can't have source null", function ()
{
    while (true)
    {
        var move = bp.sync({waitFor:moves});
        if(move.source === null) bp.ASSERT(false,"move: " + move + " source is null.");
    }
});

bp.registerBThread("move can't have target null", function ()
{
    while (true)
    {
        var move = bp.sync({waitFor:moves});
        if(move.target === null) bp.ASSERT(false,"move: " + move + " target is null.");
    }
});

bp.registerBThread("move can't have piece null", function ()
{
    while (true)
    {
        var move = bp.sync({waitFor:moves});
        if(move.piece === null) bp.ASSERT(false,"move: " + move + " piece is null.");
    }
});

bp.registerBThread("move can't be out of bounds", function ()
{
    while (true)
    {
        var move = bp.sync({waitFor:moves});
        if(move.source.row < 0 || move.source.row > 7 || move.source.column < 0 || move.source.column > 7 ||
           move.target.row < 0 || move.target.row > 7 || move.target.column < 0 || move.target.column > 7)
        {
            bp.ASSERT(false,move + " is out of bounds.");
        }
    }
});

bp.registerBThread("can't move to the same cell", function () {
   while (true)
   {
       var move = bp.sync({waitFor:moves});
       if(move.source.equals(move.target)) bp.ASSERT(false,move + " has illegal arguments (source = target).");
   }
});

bp.registerBThread("check moves made in turns", function () {
    var lastColorMove = null;
    var castling = false;

    while (true)
    {
        var currentMove = bp.sync({waitFor:moves});
        var currentColorMove = currentMove.piece.color;

        if(!castling)
        {
            if(currentColorMove.equals(lastColorMove)) bp.ASSERT(false,"Turns are not enforced.");
            else lastColorMove = currentColorMove;
        }
        else castling = false;

        if(currentMove instanceof Castling) castling = true;
    }
});

bp.registerBThread("piece verification",function () {
    while (true)
    {
        var createEvent = bp.sync({waitFor:pieceCreation}).data;

        bp.registerBThread(createEvent.piece + " can't be eaten by the same color",function () {
            var myPiece = createEvent.piece;
            var cell = createEvent.cell;
            var event;

            while (true)
            {
                event = bp.sync({waitFor:[moveTo(cell), pieceMove(myPiece)]});

                if(pieceMove(myPiece).contains(event)) cell = event.target;
                else if(myPiece.color.equals(event.piece.color)) bp.ASSERT(false,myPiece + " was eaten by a piece (" + event.piece + ") with the same color.");
                else break;
            }
        });


    }
});

bp.registerBThread("Pawn Movement verification",function ()
{
    var pawnMovement = bp.EventSet("", function (e) {
       return moves.contains(e) && e.piece.type.equals(Piece.Type.Pawn);
    });

    while (true)
    {
        var movePawnEvent = bp.sync({waitFor:pawnMovement});
        var pawnForward = movePawnEvent.piece.color.equals(Piece.Color.Black) ? -1 : 1;

        var optionalCell1 = Cell(movePawnEvent.source.row + pawnForward,movePawnEvent.source.column);
        var optionalCell2 = Cell(movePawnEvent.source.row + (2 * pawnForward),movePawnEvent.source.column);
        var optionalCell3 = Cell(movePawnEvent.source.row + pawnForward,movePawnEvent.source.column + 1);
        var optionalCell4 = Cell(movePawnEvent.source.row + pawnForward,movePawnEvent.source.column - 1);

        if(!movePawnEvent.target.equals(optionalCell1) && !movePawnEvent.target.equals(optionalCell2) &&
           !movePawnEvent.target.equals(optionalCell3) && !movePawnEvent.target.equals(optionalCell4)) bp.ASSERT(false,movePawnEvent.piece + " Movement is not by definition.");
    }
});

bp.registerBThread("Knight Movement verification",function ()
{
    var knightMovement = bp.EventSet("", function (e) {
        return moves.contains(e) && e.piece.type.equals(Piece.Type.Knight);
    });

    while (true)
    {
        var moveKnightEvent = bp.sync({waitFor:knightMovement});

        var optionalMoves = [];
        optionalMoves.push(Cell(moveKnightEvent.source.row - 1,moveKnightEvent.source.column - 2));
        optionalMoves.push(Cell(moveKnightEvent.source.row - 1,moveKnightEvent.source.column + 2));
        optionalMoves.push(Cell(moveKnightEvent.source.row - 2,moveKnightEvent.source.column - 1));
        optionalMoves.push(Cell(moveKnightEvent.source.row - 2,moveKnightEvent.source.column + 1));
        optionalMoves.push(Cell(moveKnightEvent.source.row + 1,moveKnightEvent.source.column - 2));
        optionalMoves.push(Cell(moveKnightEvent.source.row + 1,moveKnightEvent.source.column + 2));
        optionalMoves.push(Cell(moveKnightEvent.source.row + 2,moveKnightEvent.source.column - 1));
        optionalMoves.push(Cell(moveKnightEvent.source.row + 2,moveKnightEvent.source.column + 1));

        var found = false;

        for(var i = 0; i < optionalMoves.length && !found; i++)
        {
            found = moveKnightEvent.target.equals(optionalMoves[i]);
        }

        if(!found) bp.ASSERT(false,moveKnightEvent.piece + " Movement is not by definition.");
    }
});

bp.registerBThread("Rook Movement verification",function ()
{
    var rookMovement = bp.EventSet("", function (e) {
        return moves.contains(e) && e.piece.type.equals(Piece.Type.Rook);
    });

    var castling = false;

    while (true)
    {
        var state = bp.sync({waitFor:stateUpdate}).data;
        var board = state.board;

        if(rookMovement.contains(state.lastMove))
        {
            if(!castling)
            {
                var checkIndex = state.lastMove.source.row != state.lastMove.target.row ? state.lastMove.target.row : state.lastMove.target.column;
                var checkTargetIndex = state.lastMove.source.row != state.lastMove.target.row ? state.lastMove.source.row : state.lastMove.source.column;
                var delta = checkIndex < checkTargetIndex ? 1 : -1;
                while (checkIndex + delta !== checkTargetIndex)
                {
                    var current = state.lastMove.source.row != state.lastMove.target.row ? board[checkIndex + delta][state.lastMove.source.column] : board[state.lastMove.source.row][checkIndex + delta];

                    if(current !== null) bp.ASSERT(false,state.lastMove.piece + " Movement is not by definition.");

                    delta += checkIndex < checkTargetIndex ? 1 : -1;
                }
            }
            else castling = false;
        }

        if(castlingMove.contains(state.lastMove)) castling = true;
    }
});

