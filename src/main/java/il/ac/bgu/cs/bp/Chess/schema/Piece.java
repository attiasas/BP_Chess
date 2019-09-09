package il.ac.bgu.cs.bp.Chess.schema;

public class Piece extends BasicEntity
{
    public enum Type
    {
        Pawn,Knight,Bishop,Rook,Queen,King
    }

    public enum Color
    {
        Black,White
    }

    public final Type type;
    public final Color color;
    public final int counter;
//    public Cell myCell;

    public Piece(Type type, Color color, int counter)
    {
        super("" + color + "-" + type + "-" + counter);
        this.type = type;
        this.color = color;
        this.counter = counter;
    }
}
