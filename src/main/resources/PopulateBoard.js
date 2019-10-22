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
});


function parseBoard(toParse)
{
    var tokens = toParse.split("/");
    var result = [];
    var row = 0,column = 0;

    for(var i = 0; i < tokens.length; i++)
    {
        var currentRow = [];

        for(var token = 0; token < tokens[i].length(); token++)
        {
            var currentToken = tokens[i].substring(token,token+1);
            var toNum = parseInt(currentToken);

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
                }

                currentRow.push(piece);
                if(piece != null)
                {
                    var cell = Cell(row,column++);
                    bp.sync({request:bp.Event("Create",{cell:cell,piece:piece})});
                }
            }
            else
            {
                for(var n = 0; n < toNum; n++)
                {
                    currentRow.push(null);
                }
            }
        }

        column = 0;
        row++;
        result.push(currentRow);
    }

    return result;
}