package il.ac.bgu.cs.bp.Chess;

public class Cell extends BasicEntity
{
    public int row;
    public int column;

//    public Piece occupied;

    public Cell(int row, int column)
    {
        super("Cell(" + row + "," + column + ')');
        this.row = row;
        this.column = column;

//        occupied = null;
    }
/*
    @Override
    public String toString()
    {
        if(occupied == null) return super.toString();

        return occupied.toString();
    }*/
}
