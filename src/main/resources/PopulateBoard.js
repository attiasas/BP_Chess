importPackage(Packages.il.ac.bgu.cs.bp.Chess.schema);

var fenEvent = bp.EventSet("", function (e) {
   return e.name.equals("ParseFen");
});

bp.registerBThread("Populate",function ()
{
    while (true)
    {
        var toParse = bp.sync({waitFor:fenEvent}).data;

        var board = parseBoard(toParse.toString());

        bp.sync({request:bp.Event("Done Populate",board)});
    }

    //var normal = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    //var test = "8/8/3p4/3P4/8/8/8/8";

    //var board = parseBoard(normal);

    //bp.sync({request:bp.Event("Done Populate",board)});
});


//region Black Moves
/*bp.registerBThread("Set pieces Auto Moves",function () {
    var init = bp.EventSet("init event", function(evt) {
        return (evt.data==null) ?
            false :
            evt.name=="Done Populate";
    });

    var popEvent = bp.sync({waitFor:init});
    var board = popEvent.data;

    if(board != null)
    {
        for(var row = 0; row < board.length; row++)
        {
            for(var col = 0; col < board[row].length; col++)
            {
                if(board[row][col].occupied != null && board[row][col].occupied.color == Piece.Color.Black)
                {
                    switch(board[row][col].occupied.type)
                    {
                        case Piece.Type.Pawn: setPawnMoves(board,board[row][col].occupied); break;
                        case Piece.Type.Knight: setKnightMoves(board,board[row][col].occupied); break;
                        case Piece.Type.Bishop: setBishopMoves(board,board[row][col].occupied); break;
                        case Piece.Type.Rook: setRookMoves(board,board[row][col].occupied); break;
                        case Piece.Type.Queen: setQueenMoves(board,board[row][col].occupied); break;
                        case Piece.Type.King: setKingMoves(board,board[row][col].occupied); break;
                    }
                }
                //setMoves(board,board[row][col]);
            }
        }
    }
    else bp.sync({request:bp.Event("init data corrupt")});

});*/
function parseBoard(toParse)
{
    var tokens = toParse.split("/");
    var result = [];
    var currentToken = "";
    var row = 0,column = 0;
    var blackCounter = [1,1,1,1,1,1];
    var whiteCounter = [1,1,1,1,1,1];

    for(var i = 0; i < tokens.length; i++)
    {
        var currentRow = [];

        //bp.log.info("token: " + tokens[i] + "(" + (tokens[i].length()) + ")");
        for(var token = 0; token < tokens[i].length(); token++)
        {
            var currentToken = tokens[i].substring(token,token+1);
            var toNum = parseInt(currentToken);

            //bp.log.info("token: " + tokens[i] + ", toParse: " + currentToken + "(" + token + "), toNum: " + toNum + "inNan: " + isNaN(toNum));

            if(isNaN(toNum))
            {
                var piece = null;
                switch(String(currentToken))
                {
                    case "p": piece = new Piece(Piece.Type.Pawn,Piece.Color.White); break;
                    case "n": piece = new Piece(Piece.Type.Knight,Piece.Color.White); break;
                    case "b": piece = new Piece(Piece.Type.Bishop,Piece.Color.White); break;
                    case "r": piece = new Piece(Piece.Type.Rook,Piece.Color.White); break;
                    case "q": piece = new Piece(Piece.Type.Queen,Piece.Color.White); break;
                    case "k": piece = new Piece(Piece.Type.King,Piece.Color.White); break;
                    case "P": piece = new Piece(Piece.Type.Pawn,Piece.Color.Black); break;
                    case "N": piece = new Piece(Piece.Type.Knight,Piece.Color.Black); break;
                    case "B": piece = new Piece(Piece.Type.Bishop,Piece.Color.Black); break;
                    case "R": piece = new Piece(Piece.Type.Rook,Piece.Color.Black); break;
                    case "Q": piece = new Piece(Piece.Type.Queen,Piece.Color.Black); break;
                    case "K": piece = new Piece(Piece.Type.King,Piece.Color.Black); break;
                    //default: bp.log.info("Default: " + typeof piece); break;
                }

                currentRow.push(piece);
                if(piece != null)
                {
                    var cell = Cell(row,column++);
                    bp.sync({request:bp.Event("Create",{cell:cell,piece:piece})});
                }
                //bp.log.info(currentToken + " -> " + piece);
            }
            else
            {
                for(var n = 0; n < toNum; n++)
                {
                    currentRow.push(null);
                }
                //bp.log.info('0');
            }
        }

        column = 0;
        row++;
        result.push(currentRow);
    }

    return result;
}


/*function parseBoard(toParse)
{
    var tokens = toParse.split("/");
    var result = [];
    var row = 1,column = 1;

    for(var i = 0; i < tokens.length; i++)
    {
        var currentRow = [];

        for(var token = 0; token < tokens[i].length; token++)
        {
            var toNum = parseInt(tokens[i].charAt(token));
            if(isNaN(toNum))
            {
                var cell = new Cell(row,column++);
                var piece = null;
                switch(tokens[i].charAt(token))
                {
                    case 'p': piece = new Piece(Piece.Type.Pawn,Piece.Color.White); break;
                    case 'n': piece = new Piece(Piece.Type.Knight,Piece.Color.White); break;
                    case 'b': piece = new Piece(Piece.Type.Bishop,Piece.Color.White); break;
                    case 'r': piece = new Piece(Piece.Type.Rook,Piece.Color.White); break;
                    case 'q': piece = new Piece(Piece.Type.Queen,Piece.Color.White); break;
                    case 'k': piece = new Piece(Piece.Type.King,Piece.Color.White); break;
                    case 'P': piece = new Piece(Piece.Type.Pawn,Piece.Color.Black); break;
                    case 'N': piece = new Piece(Piece.Type.Knight,Piece.Color.Black); break;
                    case 'B': piece = new Piece(Piece.Type.Bishop,Piece.Color.Black); break;
                    case 'R': piece = new Piece(Piece.Type.Rook,Piece.Color.Black); break;
                    case 'Q': piece = new Piece(Piece.Type.Queen,Piece.Color.Black); break;
                    case 'K': piece = new Piece(Piece.Type.King,Piece.Color.Black); break;
                }

                if(piece != null)
                {
                    cell.occupied = piece;
                    piece.myCell = cell;
                }
                currentRow.push(cell);
            }
            else
            {
                for(var n = 0; n < toNum; n++)
                {
                    var cell = new Cell(row,column++);
                    currentRow.push(cell);
                }
            }
        }

        column = 1;
        row++;
        result.push(currentRow);
    }

    return result;
    }
 */