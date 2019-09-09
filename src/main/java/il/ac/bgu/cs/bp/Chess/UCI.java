package il.ac.bgu.cs.bp.Chess;

import il.ac.bgu.cs.bp.Chess.schema.Cell;
import il.ac.bgu.cs.bp.Chess.schema.Move;
import il.ac.bgu.cs.bp.Chess.schema.Piece;
import il.ac.bgu.cs.bp.bpjs.execution.BProgramRunner;
import il.ac.bgu.cs.bp.bpjs.execution.listeners.BProgramRunnerListenerAdapter;
import il.ac.bgu.cs.bp.bpjs.execution.listeners.PrintBProgramRunnerListener;
import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgram;
import il.ac.bgu.cs.bp.bpjs.model.ResourceBProgram;
import il.ac.bgu.cs.bp.bpjs.model.eventselection.SimpleEventSelectionStrategy;
import org.mozilla.javascript.NativeArray;

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

    private NativeArray board;

    private static final String ENGINENAME = "BP_Chess";
    private static final String AUTHOR = "Assaf Attias";

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
            moves(line);
            while (!commands.isEmpty())
            {
                line = commands.remove(0);
                System.out.println("trying again: " + line); // debug
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
        else if(line.equals("ucinewgame")) newGame();
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
            board =(NativeArray)theEvent.getData();
        }
        if(theEvent.name.contains("Wins")) quitGame();

        if((theEvent instanceof Move) && ((Move)theEvent).source != null && ((Move)theEvent).source.occupied != null && ((Move)theEvent).source.occupied.color == Piece.Color.Black)
        {
            System.out.println("bestmove " + ((Move)theEvent).toUciString());
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
        bThreadGame = new BThreadGame(this);
        bThreadGame.start();
    }

    /**
     * Quit the current game
     */
    public void quitGame()
    {
        if(bThreadGame != null && bThreadGame.isAlive()) bThreadGame.stopProgram();
    }

    /**
     * Update the BProgram that a move was made in the game
     * @param input - String in format: [from column][from row][to column][to row] (exsample: d2e3)
     */
    public void newPosition(String input)
    {
        if(board == null)
        {
            commands.add(input);
            return;
        }

        String[] tokens = input.split(" ");
        String lastToken = tokens[tokens.length - 1];

        Cell source = (Cell)(((NativeArray)board.get(lastToken.charAt(1) - '1')).get(lastToken.charAt(0) - 'a'));
        Cell target = (Cell)(((NativeArray)board.get(lastToken.charAt(3) - '1')).get(lastToken.charAt(2) - 'a'));
        Move move = new Move(source,target);

        bThreadGame.bProgram.enqueueExternalEvent(move);
    }

    /**
     * notify BProgram to start calculating
     */
    public void myTurn()
    {
        bThreadGame.bProgram.enqueueExternalEvent(new BEvent("MyTurn"));
    }

    /**
     * print the current board that the bprogram operating on, for debug purpose
     * @param debug - show only board or with pieces information
     */
    public void printBoard(boolean debug)
    {
        if(board != null && board.size() > 0)
        {
            String result = "  ";
            String pieces = "Pieces In Game:\n";
            String blackPieces = "-- Black ---\n";
            String whitePieces = "-- White ---\n";
            int blackCount = 0;
            int whiteCount = 0;

            for(char pChar = 'a'; pChar < 'i'; pChar++) result += " " + pChar + " ";
            result += "\n";

            for(int row = board.size() - 1; row >= 0; row--)
            {
                for (int column = 0; column < ((NativeArray)board.get(row)).size(); column++)
                {
                    if(column == 0) result += (row + 1) + " |";
                    else result += "|";

                    if(((Cell)((NativeArray)board.get(row)).get(column)).occupied != null)
                    {
                        if(((Cell)((NativeArray)board.get(row)).get(column)).occupied.color == Piece.Color.Black)
                        {
                            blackPieces += ((Cell)((NativeArray)board.get(row)).get(column)).occupied + " in: " + (((Cell) ((NativeArray)board.get(row)).get(column)).getId()) + "\n";
                            blackCount++;
                        }
                        else
                        {
                            whitePieces += ((Cell)((NativeArray)board.get(row)).get(column)).occupied + " in: " + (((Cell) ((NativeArray)board.get(row)).get(column)).getId()) + "\n";
                            whiteCount++;
                        }

                        Piece piece = ((Cell)((NativeArray)board.get(row)).get(column)).occupied;

                        switch (((Cell)((NativeArray)board.get(row)).get(column)).occupied.type)
                        {
                            case Pawn: if(piece.color == Piece.Color.White) result += "w|"/*"p|"*/; else result += "l|"/*"P|"*/; break;
                            case Knight: if(piece.color == Piece.Color.White) result += "n|"; else result += "N|"; break;
                            case Bishop: if(piece.color == Piece.Color.White) result += "b|"; else result += "B|"; break;
                            case Rook: if(piece.color == Piece.Color.White) result += "r|"; else result += "R|"; break;
                            case Queen: if(piece.color == Piece.Color.White) result += "q|"; else result += "Q|"; break;
                            case King: if(piece.color == Piece.Color.White) result += "k|"; else result += "K|"; break;
                        }
                    }
                    else result += " |";

                    if(column == ((NativeArray)board.get(row)).size() - 1) result += " " + (row + 1);
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
            programNames.add("No_Context_Chess_Program.js");

            bProgram = new ResourceBProgram(programNames,"ChessProgram",new SimpleEventSelectionStrategy());//,new PrioritizedBThreadsEventSelectionStrategy());
            bProgram.setWaitForExternalEvents(true);

            bRunner = new BProgramRunner(bProgram);

            bRunner.addListener( uci );
            bRunner.addListener(new PrintBProgramRunnerListener());

            bRunner.run();
        }

        public void stopProgram()
        {
            bRunner.halt();
            bProgram.setWaitForExternalEvents(false);
        }
    }
}
