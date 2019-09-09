package il.ac.bgu.cs.bp.Chess;

import il.ac.bgu.cs.bp.bpjs.execution.BProgramRunner;
import il.ac.bgu.cs.bp.bpjs.execution.listeners.PrintBProgramRunnerListener;
import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgram;
import il.ac.bgu.cs.bp.bpjs.model.ResourceBProgram;
import il.ac.bgu.cs.bp.bpjs.model.eventselection.PrioritizedBThreadsEventSelectionStrategy;

import java.util.ArrayList;
import java.util.Scanner;

/**
 * Simple class running a BPjs program that selects "hello world" events.
 * @author michael
 */
public class Main {

    public static void main(String[] args) throws InterruptedException {
        UCI uci = new UCI(System.in,System.out);
        uci.run();
        //Thread thread = new Thread(uci);
        //thread.start();



//        bProgram.enqueueExternalEvent(new BEvent("[6,7]->[4,5]"));
    }
    
}
