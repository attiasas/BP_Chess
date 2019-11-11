package il.ac.bgu.cs.bp.Chess;

public class EnPassant extends Move {

    public final Piece piece2;

    public EnPassant(Cell source, Cell target, Piece piece, Piece piece2) {
        super(source, target, piece,"EnPassant("+source+","+target+","+piece+","+piece2+")");

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
