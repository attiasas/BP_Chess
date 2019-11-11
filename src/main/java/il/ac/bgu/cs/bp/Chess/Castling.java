package il.ac.bgu.cs.bp.Chess;

public class Castling extends Move
{
    public final Cell source2;
    public final Cell target2;
    public final Piece piece2;

    public Castling(Cell source, Cell target, Piece piece, Cell source2, Cell target2, Piece piece2) {

        super(source, target, piece,"Castling([" +source+","+target+","+piece+ "][" +source2+","+target2+","+piece2+ "])");

        this.source2 = source2;
        this.target2 = target2;
        this.piece2 = piece2;
    }


    @Override
    public String toUciString() {
        return super.toUciString();
    }

    @Override
    public void updateBoard(Piece[][] board) {
        super.updateBoard(board);
    }


}
