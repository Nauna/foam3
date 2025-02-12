/**
 * @license
 * Copyright 2022 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.mlang.expr',
  name: 'DateGroupingExpr',
  extends: 'foam.mlang.AbstractExpr',

  implements: [ 'foam.core.Serializable', 'foam.mlang.order.Comparator' ],

  documentation: `
    An expr whose value is the date/month/year of a date grouping.
  `,

  javaImports: [
    'foam.nanos.auth.CreatedAware',
    'java.util.Arrays',
    'java.util.Comparator',
    'java.util.Date',
    'java.util.Calendar',
    'java.util.Locale'
  ],

  properties: [
    {
      class: 'Enum',
      of: 'foam.time.TimeUnit',
      name: 'dateGroupingType',
      value: 'MONTH'
    }
  ],

  methods: [
    {
      name: 'f',
      args: [
        {
          name: 'obj',
          type: 'Object'
        }
      ],
      code: function(obj) {
        if ( obj.created ) {
          var dateCreated = new Date(obj.created);
          if ( this.dateGroupingType == foam.time.TimeUnit.DAY ) {
            return dateCreated.toLocaleString([], { day: 'numeric', month: 'long',  year: 'numeric' });
          }
          else if ( this.dateGroupingType == foam.time.TimeUnit.MONTH ) {
            return dateCreated.toLocaleString([], { month: 'long',  year: 'numeric' });
          }
          else if ( this.dateGroupingType == foam.time.TimeUnit.YEAR ) {
            return dateCreated.toLocaleString([], { year: 'numeric' });
          }
        }
        return 'Unknown Range';
      },
      javaCode: `
        CreatedAware createdAwareObj = (CreatedAware) obj;

        if ( createdAwareObj.getCreated() != null ) {
          Date dateCreated = new Date(createdAwareObj.getCreated().toString());
          Calendar c = Calendar.getInstance();
          c.setTime(dateCreated);

          if ( getDateGroupingType().getName().equals(foam.time.TimeUnit.DAY.getName()) ) {
            return Integer.toString(c.get(Calendar.DAY_OF_MONTH)) + " " + c.getDisplayName(Calendar.MONTH, Calendar.LONG, new Locale("en") ) + ", " + Integer.toString(c.get(Calendar.YEAR));
          }
          else if ( getDateGroupingType().getName().equals(foam.time.TimeUnit.MONTH.getName()) ) {
            return c.getDisplayName(Calendar.MONTH, Calendar.LONG, new Locale("en") ) + " " + Integer.toString(c.get(Calendar.YEAR));
          }
          else if ( getDateGroupingType().getName().equals(foam.time.TimeUnit.YEAR.getName()) ) {
            return Integer.toString(c.get(Calendar.YEAR));
          }
        }
        return "Unknown Range";
      `
    },
    {
      name: 'compare',
      code: function(o1, o2) {
        let a1 = new Date(o1?.created);
        let a2 = new Date(o2?.created);
        return foam.util.compare(a1, a2);
      },
      javaCode: `
        CreatedAware c1 = (CreatedAware) o1;
        CreatedAware c2 = (CreatedAware) o2;
        java.util.Date date1 = (java.util.Date) c1.getCreated();
        java.util.Date date2 = (java.util.Date) c2.getCreated();
        return date1.compareTo(date2);
      `
    }
  ]
});
