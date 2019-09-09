
var moves = bp.EventSet("Game Moves", function (e) {
   return (e instanceof Move);
});

var eatMoves = bp.EventSet("Eat Other Color Pieces Moves", function (e) {
   return (e instanceof Move) && (e.target.occupied != null) && (e.source.occupied != null) &&(e.source.occupied.color != e.target.occupied.color);
});

var normalMoves = bp.EventSet("Non Eat Moves", function (e) {
   return (e instanceof Move) && (e.source.occupied != null) && (e.target.occupied == null);
});

var whiteMoves = bp.EventSet("White Moves",function (e) {
   return (e instanceof Move) && (e.source.occupied != null) && (Piece.Color.White === e.source.occupied.color);
});

var blackMoves = bp.EventSet("black Moves",function (e) {
   return (e instanceof Move) && (e.source.occupied != null) && (Piece.Color.Black === e.source.occupied.color);
});

//region Game Rules
bp.registerBThread("UpdateCellOnNormalMove",function () {
   while (true)
   {
      var move = bp.sync({waitFor:moves});
      var targetPiece = move.target.occupied;

      move.source.occupied.myCell = move.target;
      move.target.occupied = move.source.occupied;
      move.source.occupied = null;
   }
});

bp.registerBThread("UpdateEatenPieceLocation",function () {

   while (true)
   {
      var move = bp.sync({waitFor:eatMoves});
      bp.log.INFO(move.target.occupied + " eaten.");

      // move.source.occupied.myCell = move.target;
      move.target.occupied.myCell = null;

      // move.target.occupied = move.source.occupied;
      // move.source.occupied = null;

      // bp.sync({request:bp.Event("Done Movement")});
   }
});

function detectWin(win, lose)
{
   bp.registerBThread("Detect " + win + " Win", function () {

      var kingEaten = bp.EventSet("Game Win Moves", function (e) {
         return (e.name.startsWith("Eaten") && e.name.contains("King") && e.name.contains(lose));
      });

      bp.sync({waitFor:kingEaten});
      bp.sync({request:bp.Event(win + " Wins")});
      bp.sync({block:moves});
   });
}

detectWin("White","Black");
detectWin("Black","White");

bp.registerBThread("EnforceTurns",function () {
   while (true)
   {
      bp.sync({waitFor:whiteMoves,block:blackMoves});
      //bp.log.info("White move found, waiting for black");
      bp.sync({waitFor:blackMoves,block:whiteMoves});
      //bp.log.info("Black move found, waiting for white");
   }
});

bp.registerBThread("Enforce Legal Movement",function ()
{
   var unLegal = bp.EventSet("Not Legal", function (e) {
      return (e instanceof Move) && (e.source.occupied == null || (e.target.occupied != null && e.source.occupied.color == e.target.occupied.color));
   });

   bp.sync({block:unLegal});
});
//endregion





function getMove(source,target) {
   return new Move(source,target);
}


//region Pawn
function setPawnMoves(board,piece) {
   if(board == null || piece == null) return;

   bp.registerBThread("regular move " + piece, function(){
      var count = 1;
      if(piece.color.equals(Piece.Color.Black))
         count = -1;
      while(piece.myCell !== null) {
         bp.sync({request: getMove(piece.myCell, board[piece.myCell.row + count][piece.myCell.col])});
      }
   });
/*
   bp.registerBThread("Enforce " + piece + " Movement", function(){
         var gameBoard = board;
         var myPiece = piece;
         var myMoves = bp.EventSet(myPiece + "Movements",function (e) {
            return (e instanceof Move) && e.source.occupied == myPiece;
         });

         bp.sync({waitFor:myMoves});

         while (myPiece.myCell != null)
         {

            bp.sync({waitFor:bp.Event("Done Movement")});

            if((myPiece.myCell.row - 3) >= 0)
            {
               var extraMove = getMove(myPiece.myCell,gameBoard[(myPiece.myCell.row - 3)][(myPiece.myCell.column-1)]);
               //bp.log.info("Extra Move: " + extraMove.source + "(" + extraMove.source.id + ") ->" + extraMove.target + "(" + extraMove.target.id + ")");
               bp.sync({block:extraMove});
               //bp.log.info("done wait");
            }
         }
      });

         bp.registerBThread(piece + "Eat Movement",function () {
            var gameBoard = board;
            var myPiece = piece;

            while (myPiece.myCell != null)
            {
               bp.sync({waitFor:bp.Event("MyTurn")});

               if(myPiece.myCell != null)
               {
                  var eatOptions = [];
                  // eat left
                  if(myPiece.myCell.row - 2 >= 0 &&
                      (myPiece.myCell.column-2) >= 0 &&
                      (gameBoard[(myPiece.myCell.row - 2)][(myPiece.myCell.column-2)]).occupied != null)
                  {
                     bp.log.info("in eat left: " + myPiece);
                     eatOptions.push(getMove(myPiece.myCell,gameBoard[(myPiece.myCell.row - 2)][(myPiece.myCell.column-2)]));
                  }
                  // eat right
                  if(myPiece.myCell.row - 2 >= 0 &&
                      myPiece.myCell.column < gameBoard[(myPiece.myCell.row - 2)].length &&
                      (gameBoard[(myPiece.myCell.row - 2)][myPiece.myCell.column]).occupied != null)
                  {
                     bp.log.info("in eat right: " + myPiece);
                     eatOptions.push(getMove(myPiece.myCell,gameBoard[(myPiece.myCell.row - 2)][(myPiece.myCell.column)]));
                  }

                  bp.sync({request:eatOptions,waitFor:blackMoves});
               }
      }
   });

   bp.registerBThread(piece + " Auto Movement", function(){

      var gameBoard = board;
      var myPiece = piece;

       while (myPiece.myCell != null)
       {
          bp.sync({waitFor:bp.Event("MyTurn")});

          if(myPiece.myCell != null && (myPiece.myCell.row - 2) >= 0 && (gameBoard[(myPiece.myCell.row - 2)][(myPiece.myCell.column-1)]).occupied == null)
          {
             var normalMove = getMove(myPiece.myCell,gameBoard[(myPiece.myCell.row - 2)][(myPiece.myCell.column-1)]);
             if((myPiece.myCell.row - 3) >= 0 && (gameBoard[(myPiece.myCell.row - 3)][(myPiece.myCell.column-1)]).occupied == null)
             {
                var extraMove = getMove(myPiece.myCell,gameBoard[(myPiece.myCell.row - 3)][(myPiece.myCell.column-1)]);
             }

             bp.sync({request:[normalMove,extraMove],waitFor:blackMoves});
          }
          //bp.log.info("done " + myPiece + "turn");
       }
   });*/
}
//endregion Pawn


function setKnightMoves(board,piece) {
   if(board == null || piece == null) return;
}
function setBishopMoves(board,piece) {
   if(board == null || piece == null) return;
}
function setRookMoves(board,piece) {
   if(board == null || piece == null) return;
}
function setQueenMoves(board,piece) {
   if(board == null || piece == null) return;
}

function setKingMoves(board, piece)
{
   if(board == null || piece == null) return;


}


//endregion

