/**
 * @license
 * Copyright 2021 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

package foam.util.concurrent;

import java.util.*;

/**
 * This delegates to a FoldReduction rather than just being an AbstractFoldReduction because
 * this approach lets me model FoldReduction objects as JavaBeans if required.
 **/
public abstract class FoldReducer {
  /**
   * Number of new LocalState connections which causes a FoldReduce
   * to prevent memory usage from accumulating
   **/
  protected final static int  CLEANUP_COUNT = 5000;

  protected final ThreadLocal local__;
  protected final List        states_       = new ArrayList();
  protected       Object      state_        = null;
  /** Number of LocalState objects connected since last FoldReduce. **/
  protected       int         connectCount_ = 0;

	public FoldReducer() {
    setState(initialState());

    local__ = new ThreadLocal() {
      protected Object initialValue() {
        LocalState ret = new LocalState(FoldReducer.this);

        return ret;
      }
    };
	}


  /** Template method to Create initial state. **/
  public abstract Object initialState();

  /** Template method to Fold a new update into a state. **/
  public abstract void fold(Object state, Object op);

  /** Template method to Merge two states. **/
  public abstract Object reduce(Object state1, Object state2);


  protected synchronized void connect(LocalState local) {
    if ( connectCount_++ == CLEANUP_COUNT ) {
      connectCount_ = 0;
      getState();
    }

    states_.add(local);
  }


  /**
   * Get the LocalState object specific to the calling Thread.
   * ie. a ThreadLocal copy
   **/
  public LocalState getLocalState() {
    LocalState local = (LocalState) local__.get();

    return local;
  }

	public void fold(Object op) {
    getLocalState().fold(op);
	}

  public synchronized void setState(Object state) {
    state_ = state;
  }


  /**
   * Reset to initial state.
   *
   * @return the state just prior to being reset
   **/
  public synchronized Object resetState() {
    Object ret = getState(); // invoke reduce to clear local states

    setState(initialState());

    return ret;
  }


  /**
   * Reduce all ThreadLocal States into a single State
   **/
	public synchronized Object getState() {
    try {
      for ( Iterator i = states_.iterator() ; i.hasNext() ; ) {
        state_ = reduce(state_, ((LocalState) i.next()).resetState());
      }
    } finally {
      // Once we have called resetState above we must ensure it is disconnected which is
      // done by clearing out all LocalStates at once (faster then doing in resetState one
      // at a time). If the above exits with OOME the combination of the existing connect
      // (presence in states_) with a connected_ state of false can (and did) lead to
      // deadlock. This finally block adds some extra resilience.
      states_.clear();
    }

    return state_;
	}
}
