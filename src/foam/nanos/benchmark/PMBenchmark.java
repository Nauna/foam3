/**
 * @license
 * Copyright 2017 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

package foam.nanos.benchmark;

import foam.core.X;
import foam.nanos.bench.Benchmark;
import foam.nanos.bench.BenchmarkRunner;
import foam.nanos.bench.BenchmarkRunner.Builder;
import foam.nanos.pm.*;
import java.util.Map;

public class PMBenchmark
  extends Benchmark
{
  @Override
  public void execute(X x) {
    PM pm = new PM(foam.nanos.bench.Benchmark.class, "abc");
    pm.log(x);
  }
}
