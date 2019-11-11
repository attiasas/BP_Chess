package il.ac.bgu.cs.bp.Chess;

import il.ac.bgu.cs.bp.bpjs.execution.BProgramRunner;
import il.ac.bgu.cs.bp.bpjs.execution.listeners.BProgramRunnerListenerAdapter;
import il.ac.bgu.cs.bp.bpjs.execution.listeners.PrintBProgramRunnerListener;
import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgram;
import il.ac.bgu.cs.bp.bpjs.model.ResourceBProgram;
import il.ac.bgu.cs.bp.bpjs.model.eventselection.SimpleEventSelectionStrategy;
import org.mozilla.javascript.NativeArray;
import org.mozilla.javascript.NativeObject;

import java.io.InputStream;
import java.io.PrintStream;
import java.util.ArrayList;
import java.util.Scanner;

/**
 * Universal Chess Interface (UCI) implementation that communicates with behavioral programming
 */
public class UCI extends BProgramRunnerListenerAdapter implements Runnable
{
    private BThreadGame bThreadGame;
    private ArrayList<String> commands;

    private PrintStream mUciOut; // send commands to gui
    private Scanner mUciIn; // receive updates from gui

    //private NativeArray board;
    private Piece[][] pieceBoard;
    private boolean ready;

    private static final String ENGINENAME = "BP_Chess";
    private static final String AUTHOR = "Assaf Attias";

    private boolean turn = true; // debug
    private int moveCount = 0; // debug

    /**
     * Constructor
     * @param in
     * @param out
     */
    public UCI(InputStream in, PrintStream out)
    {
        mUciIn = new Scanner(in);
        mUciOut = out;
        commands = new ArrayList<>();
    }

    @Override
    /**
     * Chess Game loop implemented using UCI protocol
     */
    public void run()
    {
        String line;

        while (true)
        {
            line = mUciIn.nextLine();
            System.out.println("Received: " + line); // debug

            if(line.equals("quit"))
            {
                quitGame();
                break;
            }
            else if(line.equals("ucinewgame")) newGame();
            else if(!ready)
            {
                commands.add(line);
            }
            else moves(line);

            while (!commands.isEmpty())
            {
                line = commands.remove(0);
                //System.out.println("trying again: " + line); // debug
                moves(line);
            }
        }
    }

    /**
     * Handle and direct the different options in the protocol
     * @param line
     */
    private void moves(String line)
    {
        //System.out.println("Handling: " + line); // debug
        if(line.equals("uci")) initCommunication();
        else if(line.startsWith("setoption")) setOptions(line);
        else if(line.equals("isready")) isReady();
        else if(line.equals("stop")) quitGame();
        else if(line.startsWith("position")) newPosition(line);
        else if(line.startsWith("go")) myTurn();
        else if(line.equals("print")) printBoard(false);
        else if(line.equals("debug")) printBoard(true);
    }

    @Override
    public void eventSelected(BProgram bp, BEvent theEvent)
    {
        if(theEvent.name.equals("Done Populate"))
        {
            NativeArray board =(NativeArray)theEvent.getData();
            for(int row = 0; row < board.size(); row++)
            {
                for(int column = 0; column < ((NativeArray)board.get(row)).size(); column++)
                {
                    if(((NativeArray)board.get(row)).get(column) instanceof Piece)
                    {
                        //System.out.println("Update: " + pieceBoard[row][column] + " -> " + ((NativeArray)board.get(row)).get(column));
                        pieceBoard[row][column] = (Piece)((NativeArray)board.get(row)).get(column);
                    }
                    //else System.out.println("Empty");
                    //System.out.println("Done col " + column);
                }
                //System.out.println("Done row " + row + " size: " + ((NativeArray)board.get(row)).size());
            }
            //System.out.println("Done Update UCI");
            ready = true;
            moveCount = 0;
        }

        if((theEvent instanceof Move) && ((Move)theEvent).source != null && ((Move)theEvent).target != null && ((Move)theEvent).piece != null)
        {
            if(((Move)theEvent).piece.color.equals(Piece.Color.Black))
            {
                System.out.println("bestmove " + ((Move)theEvent).toUciString());
            }
            ((Move)theEvent).updateBoard(pieceBoard);
            turn = !turn;
        }

        if(theEvent.name.equals("CheckMateState") || theEvent.name.equals("DrawState")) quitGame();

        if(theEvent.name.startsWith("EnPassant")) System.out.println("EN PASSANT!!! <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

        if(theEvent.name.equals("StateUpdate"))
        {
            Move theMove = (Move)((NativeObject)theEvent.getDataField().get()).values().toArray()[1];
            String s = "TheMove: " + theMove + " (num: "+ (++moveCount) +")\n" + "TheBoard:" + "\n";
            NativeArray board = (NativeArray)((NativeObject)theEvent.getDataField().get()).values().toArray()[0];

            for(int row = board.size() - 1; row >= 0 ; row--) {
                for (int column = 0; column < ((NativeArray) board.get(row)).size(); column++) {

                    if(column == 0) s += (row + 1) + " |";
                    else s += "|";

                    if (((NativeArray) board.get(row)).get(column) instanceof Piece) {
                        Piece p = (Piece)((NativeArray) board.get(row)).get(column);
                        switch (p.type)
                        {
                            case Pawn: if(p.color.equals(Piece.Color.White)) s += "w|"/*"p|"*/; else s += "l|"/*"P|"*/; break;
                            case Knight: if(p.color.equals(Piece.Color.White)) s += "n|"; else s += "N|"; break;
                            case Bishop: if(p.color.equals(Piece.Color.White)) s += "b|"; else s += "B|"; break;
                            case Rook: if(p.color.equals(Piece.Color.White)) s += "r|"; else s += "R|"; break;
                            case Queen: if(p.color.equals(Piece.Color.White)) s += "q|"; else s += "Q|"; break;
                            case King: if(p.color.equals(Piece.Color.White)) s += "k|"; else s += "K|"; break;
                        }
                    }
                    else s += " |";

                    if(column == ((NativeArray)board.get(row)).size() - 1) s += " " + (row + 1);
                }
                s += "\n";
            }

            s += "  ";
            for(char pChar = 'a'; pChar < 'i'; pChar++) s += " " + pChar + " ";

            System.out.println(s);
        }
    }

    //<editor-fold desc="Init Communications">
    /**
     * Initialize the communication with the GUI (Init stage of the protocol)
     */
    private void initCommunication()
    {
        // send engine information
        mUciOut.println("id name " + ENGINENAME);
        mUciOut.println("id author " + AUTHOR);

        /* custom options goes here */

        mUciOut.println("uciok"); // done init
    }

    /**
     * Handle feedback from gui about the Options that we send (Init stage of the protocol)
     * @param optionsString
     */
    private void setOptions(String optionsString) { }

    /**
     * Reply that all preparations are over and everything is ready
     */
    private void isReady() { mUciOut.println("readyok");}
    //</editor-fold>

    //<editor-fold desc="Game Communications">
    /**
     * Start a new Game of chess
     */
    public void newGame()
    {
        quitGame();

        pieceBoard = new Piece[8][8];
        ready = false;

        bThreadGame = new BThreadGame(this);
        bThreadGame.start();
    }

    /**
     * Quit the current game
     */
    public void quitGame()
    {
        if(bThreadGame != null && bThreadGame.isAlive()) bThreadGame.stopProgram();
        ready = false;
    }

    /**
     * Update the BProgram that a move was made in the game
     * @param input - String in format: [from column][from row][to column][to row] (example: d2e3)
     */
    public void newPosition(String input)
    {


        String[] tokens = input.split(" ");
        String lastToken = tokens[tokens.length - 1];

        //Cell source = (Cell)(((NativeArray)board.get(lastToken.charAt(1) - '1')).get(lastToken.charAt(0) - 'a'));
        //Cell target = (Cell)(((NativeArray)board.get(lastToken.charAt(3) - '1')).get(lastToken.charAt(2) - 'a'));

        Cell source = new Cell(lastToken.charAt(1) - '1',lastToken.charAt(0) - 'a');
        Cell target = new Cell(lastToken.charAt(3) - '1',lastToken.charAt(2) - 'a');
        Move move = new Move(source,target,pieceBoard[source.row][source.column]);

        bThreadGame.bProgram.enqueueExternalEvent(move);
    }

    /**
     * notify BProgram to start calculating
     */
    public void myTurn()
    {
        if(turn)
        {
            bThreadGame.bProgram.enqueueExternalEvent(new BEvent("White Turn"));
        }
        else
        {
            bThreadGame.bProgram.enqueueExternalEvent(new BEvent("Black Turn"));
        }
    }

    /**
     * print the current board that the bprogram operating on, for debug purpose
     * @param debug - show only board or with pieces information
     */
    public void printBoard(boolean debug)
    {
        if(ready)
        {
            String result = "  ";
            String pieces = "Pieces In Game:\n";
            String blackPieces = "-- Black ---\n";
            String whitePieces = "-- White ---\n";
            int blackCount = 0;
            int whiteCount = 0;

            for(char pChar = 'a'; pChar < 'i'; pChar++) result += " " + pChar + " ";
            result += "\n";

            for(int row = pieceBoard.length - 1; row >= 0; row--)
            {
                for (int column = 0; column < pieceBoard[row].length; column++)
                {
                    if(column == 0) result += (row + 1) + " |";
                    else result += "|";

                    if(pieceBoard[row][column] != null)
                    {
                        if(pieceBoard[row][column].color.equals(Piece.Color.Black))
                        {
                            blackPieces += pieceBoard[row][column] + " in: Cell(" + row + "," + column + ")\n";
                            blackCount++;
                        }
                        else
                        {
                            whitePieces += pieceBoard[row][column] + " in: Cell(" + row + "," + column + ")\n";
                            whiteCount++;
                        }

                        switch (pieceBoard[row][column].type)
                        {
                            case Pawn: if(pieceBoard[row][column].color.equals(Piece.Color.White)) result += "w|"/*"p|"*/; else result += "l|"/*"P|"*/; break;
                            case Knight: if(pieceBoard[row][column].color.equals(Piece.Color.White)) result += "n|"; else result += "N|"; break;
                            case Bishop: if(pieceBoard[row][column].color.equals(Piece.Color.White)) result += "b|"; else result += "B|"; break;
                            case Rook: if(pieceBoard[row][column].color.equals(Piece.Color.White)) result += "r|"; else result += "R|"; break;
                            case Queen: if(pieceBoard[row][column].color.equals(Piece.Color.White)) result += "q|"; else result += "Q|"; break;
                            case King: if(pieceBoard[row][column].color.equals(Piece.Color.White)) result += "k|"; else result += "K|"; break;
                        }

                        //System.out.println("row=" + row + ", column=" + column + ", piece=" + pieceBoard[row][column]);
                    }
                    else result += " |";

                    if(column == pieceBoard[row].length - 1) result += " " + (row + 1);
                }
                result += "\n";
            }

            result += "  ";
            for(char pChar = 'a'; pChar < 'i'; pChar++) result += " " + pChar + " ";

            System.out.println(result);
            if(debug)
            {
                pieces += whitePieces + "total: " + (whiteCount) + "\n------------\n" + blackPieces + "total: " + (blackCount) + "\n------------\n";
                System.out.println(pieces);
            }
        }
        else System.out.println("No BOARD!");
    }

//    /**
//     * print the current board that the bprogram operating on, for debug purpose
//     * @param debug - show only board or with pieces information
//     */
//    public void printBoard(boolean debug)
//    {
//        if(board != null && board.size() > 0)
//        {
//            String result = "  ";
//            String pieces = "Pieces In Game:\n";
//            String blackPieces = "-- Black ---\n";
//            String whitePieces = "-- White ---\n";
//            int blackCount = 0;
//            int whiteCount = 0;
//
//            for(char pChar = 'a'; pChar < 'i'; pChar++) result += " " + pChar + " ";
//            result += "\n";
//
//            for(int row = board.size() - 1; row >= 0; row--)
//            {
//                for (int column = 0; column < ((NativeArray)board.get(row)).size(); column++)
//                {
//                    if(column == 0) result += (row + 1) + " |";
//                    else result += "|";
//
//                    if(((Cell)((NativeArray)board.get(row)).get(column)).occupied != null)
//                    {
//                        if(((Cell)((NativeArray)board.get(row)).get(column)).occupied.color == Piece.Color.Black)
//                        {
//                            blackPieces += ((Cell)((NativeArray)board.get(row)).get(column)).occupied + " in: " + (((Cell) ((NativeArray)board.get(row)).get(column)).getId()) + "\n";
//                            blackCount++;
//                        }
//                        else
//                        {
//                            whitePieces += ((Cell)((NativeArray)board.get(row)).get(column)).occupied + " in: " + (((Cell) ((NativeArray)board.get(row)).get(column)).getId()) + "\n";
//                            whiteCount++;
//                        }
//
//                        Piece piece = ((Cell)((NativeArray)board.get(row)).get(column)).occupied;
//
//                        switch (((Cell)((NativeArray)board.get(row)).get(column)).occupied.type)
//                        {
//                            case Pawn: if(piece.color == Piece.Color.White) result += "w|"/*"p|"*/; else result += "l|"/*"P|"*/; break;
//                            case Knight: if(piece.color == Piece.Color.White) result += "n|"; else result += "N|"; break;
//                            case Bishop: if(piece.color == Piece.Color.White) result += "b|"; else result += "B|"; break;
//                            case Rook: if(piece.color == Piece.Color.White) result += "r|"; else result += "R|"; break;
//                            case Queen: if(piece.color == Piece.Color.White) result += "q|"; else result += "Q|"; break;
//                            case King: if(piece.color == Piece.Color.White) result += "k|"; else result += "K|"; break;
//                        }
//                    }
//                    else result += " |";
//
//                    if(column == ((NativeArray)board.get(row)).size() - 1) result += " " + (row + 1);
//                }
//                result += "\n";
//            }
//
//            result += "  ";
//            for(char pChar = 'a'; pChar < 'i'; pChar++) result += " " + pChar + " ";
//
//            System.out.println(result);
//            if(debug)
//            {
//                pieces += whitePieces + "total: " + (whiteCount) + "\n------------\n" + blackPieces + "total: " + (blackCount) + "\n------------\n";
//                System.out.println(pieces);
//            }
//        }
//        else System.out.println("No BOARD!");
//    }
    //</editor-fold>

    /**
     * A separate thread from the uci that handles the BThreads Program
     */
    private class BThreadGame extends Thread
    {
        public BProgram bProgram;
        public BProgramRunner bRunner;
        private UCI uci;

        public BThreadGame(UCI uci) { this.uci = uci; }

        @Override
        public void run() {

            ArrayList<String> programNames = new ArrayList<>();
            programNames.add("PopulateBoard.js");
            programNames.add("rules_no_context.js");
            programNames.add("verification.js");

            bProgram = new ResourceBProgram(programNames,"ChessProgram",new SimpleEventSelectionStrategy());//,new PrioritizedBThreadsEventSelectionStrategy());
            bProgram.setWaitForExternalEvents(true);

            bRunner = new BProgramRunner(bProgram);

            bRunner.addListener( uci );
            bRunner.addListener(new PrintBProgramRunnerListener());

            String normalStart = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
            bProgram.enqueueExternalEvent(new BEvent("ParseFen",normalStart));

            bRunner.run();
        }

        public void stopProgram()
        {
            bRunner.halt();
            bProgram.setWaitForExternalEvents(false);
            uci.ready = false;
        }
    }
}
