package il.ac.bgu.cs.bp.Chess;

import java.util.HashMap;

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

    private static HashMap<Type,Integer> whiteCounter = new HashMap<>();
    private static HashMap<Type,Integer> blackCounter = new HashMap<>();
//    public Cell myCell;

    public Piece(Type type, Color color)
    {

        HashMap<Type,Integer> map = (color.equals(Color.White) ? whiteCounter : blackCounter);

        if(!map.containsKey(type)) map.put(type,1);

        this.type = type;
        this.color = color;
        this.counter = map.replace(type,map.get(type)+1);

        this.id = ("" + this.color + "-" + this.type + "-" + counter);
    }

    public Piece(Type type, Color color, int counter)
    {
        super("" + color + "-" + type + "-" + counter);
        this.type = type;
        this.color = color;
        this.counter = counter;
    }

    public boolean isSameType(Piece other)
    {
        return this.type.equals(other.type);
    }
}
