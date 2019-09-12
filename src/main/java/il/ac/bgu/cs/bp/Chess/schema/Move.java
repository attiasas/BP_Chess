package il.ac.bgu.cs.bp.Chess.schema;

import il.ac.bgu.cs.bp.bpjs.model.BEvent;

public class Move extends BEvent
{
    public final Cell source;
    public final Cell target;
    public final Piece piece;

    public Move(Cell source, Cell target, Piece piece)
    {
        super("Move("+source+","+target+","+piece);
        this.source = source;
        this.target = target;
        this.piece = piece;
    }

    public String toUciString()
    {
        String res = "";

        res += (char)(source.column + 'a');
        res += (source.row + 1);
        res += (char)(target.column + 'a');
        res += (target.row + 1);

        //res += " [" + source.id + " -> " + target.id + "]"; // debug

        return res;
    }

    public void updateBoard(Piece[][] board)
    {
        if(source.row < 0 || source.row > board.length || source.column < 0 || source.column >= board[source.row].length) return;
        if(target.row < 0 || target.row > board.length || target.column < 0 || target.column >= board[target.row].length) return;
        board[source.row][source.column] = null;
        board[target.row][target.column] = piece;
    }

  /*  @Override
    public String toString()
    {
        return source + "->" + target;
    }*/

    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (obj == null)
            return false;
        if (getClass() != obj.getClass())
            return false;
        Move other = (Move) obj;
        if (source == null) {
            if (other.source != null)
                return false;
        }
        else if (target == null) {
            if (other.target != null)
                return false;
        }
        else if (piece == null) {
            if (other.piece != null)
                return false;
        }else if (!source.equals(other.source) || !target.equals(other.target) || !piece.equals(other.piece))
            return false;
        return true;
    }
}
