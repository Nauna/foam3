/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

foam.CLASS({
  package: 'foam.dao',
  name: 'ProxyDAO',
  extends: 'foam.dao.AbstractDAO',

  requires: [
    'foam.dao.NullDAO',
    'foam.dao.ProxyListener',
  ],

  documentation: 'Proxy implementation for the DAO interface.',

  properties: [
    {
      class: 'Proxy',
      of: 'foam.dao.DAO',
      name: 'delegate',
      forwards: [ 'put_', 'remove_', 'find_', 'select_', 'removeAll_', 'listen_' ],
      topics: [ 'on' ], // TODO: Remove this when all users of it are updated.
      factory: function() { return this.NullDAO.create() },
      postSet: function(old, nu) {
        if ( old ) this.on.reset.pub();
      },
      swiftFactory: 'return NullDAO_create()',
      swiftPostSet: `
if let oldValue = oldValue as? foam_dao_AbstractDAO {
  _ = oldValue.on["reset"].pub()
}
      `,
    },
    {
      name: 'of',
      expression: function(delegate) {
        return delegate.of;
      },
      swiftExpressionArgs: ['delegate$of'],
      swiftExpression: 'return delegate$of as! ClassInfo',
      javaFactory: `return getDelegate().getOf();`
    }
  ],

  methods: [
    {
      name: 'cmd_',
      code: function cmd_(x, obj) {
        return this.delegate.cmd_(x, obj);
      },
      javaCode: `
        if ( obj != null && obj instanceof String ) {
          String s = (String) obj;
          if ( s.startsWith("CLASS? ") ) {
            try {
              if ( Class.forName(s.substring(7)).isAssignableFrom(getClass()) ) return true;
            } catch (ClassNotFoundException e) {
            }
          }
        }
        return getDelegate().cmd_(x, obj);
      `
    },
    {
      name: 'listen_',
      code: function listen_(context, sink, predicate) {
        var listener = this.ProxyListener.create({
          delegate: sink,
          predicate: predicate,
          dao: this
        }, context);

        listener.onDetach(this.sub('propertyChange', 'delegate', listener.update));
        listener.update();

        return listener;
      },
      swiftCode: `
let listener = ProxyListener_create([
  "delegate": sink,
  "predicate": predicate
], x)

listener.onDetach(listener.dao$.follow(delegate$))

return listener
      `,
      javaCode: `
        // TODO: Support changing of delegate
        // TODO: Return a detachable
        getDelegate().listen_(getX(), sink, predicate);
      `
    },
    {
      name: 'fclone',
      type: 'FObject',
      javaCode: `
        return this;
      `
    }
  ],

  axioms: [
    {
      buildJavaClass: function(cls) {
        cls.extras.push(`
  public ProxyDAO(foam.core.X x, foam.dao.DAO delegate) {
    setX(x);
    setDelegate(delegate);
  }

  public ProxyDAO(foam.core.X x, foam.core.ClassInfo of, foam.dao.DAO delegate) {
    setX(x);
    setOf(of);
    setDelegate(delegate);
  }
        `);
      }
    }
  ]
});


foam.CLASS({
  package: 'foam.dao',
  name: 'ProxyListener',
  flags: ['js', 'swift'],

  implements: ['foam.dao.Sink'],

  properties: [
    {
      name: 'predicate',
      swiftType: 'foam_mlang_predicate_Predicate?'
    },
    {
      class: 'Proxy',
      of: 'foam.dao.Sink',
      name: 'delegate'
    },
    {
      name: 'innerSub',
      type: 'foam.core.Detachable',
      swiftPostSet: 'if let s = newValue { onDetach(s) }'
    },
    {
      class: 'foam.dao.DAOProperty',
      name: 'dao',
      swiftPostSet: `
self.innerSub?.detach()
try? self.innerSub = newValue?.listen_(__context__, self, predicate)
if oldValue != nil {
  self.reset(Subscription(detach: {}))
}
      `
    }
  ],

  methods: [
    {
      name: 'put',
      code: function put(obj, s) {
        this.delegate.put(obj, this);
      },
      swiftCode: 'delegate.put(obj, self)',
    },

    function outputJSON(outputter) {
      outputter.output(this.delegate);
    },

    {
      name: 'remove',
      code: function remove(obj, s) {
        this.delegate.remove(obj, this);
      },
      swiftCode: 'delegate.remove(obj, self)',
    },

    {
      name: 'reset',
      code: function reset(s) {
        this.delegate.reset(this);
      },
      swiftCode: 'delegate.reset(self)',
    },

    function detach() {
      if ( this.innerSub ) this.innerSub.detach();
      this.SUPER();
    }
  ],

  listeners: [
    {
      name: 'update',
      code: function() {
        var old = this.innerSub;
        old && old.detach();
        this.innerSub = this.dao &&
          this.dao.delegate &&
          this.dao.delegate.listen_(this.__context__, this, this.predicate);
        this.reset();
      }
    }
  ]
});


foam.CLASS({
  package: 'foam.dao',
  name: 'PromisedDetachable',

  properties: [
    { name: 'promise', factory: function() { return this.Latch.create(); } }
  ],

  methods: [
    function detach() {
      this.promise.then(p => {
        p.detach();
        this.promise = null;
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.dao',
  name: 'PromisedDAO',
  extends: 'foam.dao.AbstractDAO',

  properties: [
    {
      class: 'Promised',
      of: 'foam.dao.DAO',
      methods: [ 'put_', 'remove_', 'find_', 'select_', 'removeAll_', 'listen_', 'cmd_' ],
      name: 'promise',
      factory: function() { return foam.core.Latch.create(); }
    }
  ],

  methods: [
    {
      name: 'listen_',
      flags: ['js'],
      code: function(x, sink, predicate) {
        return foam.dao.PromisedDetachable.create({promise: this.promise.then(dao => {
          return dao.listen_(x, sink, predicate);
        })});
      }
    }
  ]
});


foam.CLASS({
  package: 'foam.dao',
  name: 'LocalStorageDAO',
  extends: 'foam.dao.ArrayDAO',

  flags: [],

  properties: [
    {
      name:  'name',
      label: 'Store Name',
      class:  'foam.core.String'
    }
  ],

  methods: [
    function init() {
      var objs = localStorage.getItem(this.name);
      if ( objs ) this.array = foam.json.parseString(objs, this.__context__);

      this.on.put.sub(this.updated);
      this.on.remove.sub(this.updated);

      // TODO: base on an indexed DAO
    }
  ],

  listeners: [
    {
      name: 'updated',
      isMerged: true,
      mergeDelay: 100,
      code: function() {
        localStorage.setItem(this.name, foam.json.stringify(this.array));
      }
    }
  ]
});


foam.LIB({
  name: 'foam.String',
  methods: [
    {
      name: 'daoize',
      code: foam.Function.memoize1(function(str) {
        // Turns SomeClassName into someClassNameDAO,
        // of package.ClassName into package.ClassNameDAO
        return str.substring(0, 1).toLowerCase() + str.substring(1) + 'DAO';
      })
    }
  ]
});


foam.CLASS({
  package: 'foam.dao',
  name: 'InvalidArgumentException',
  extends: 'foam.dao.ExternalException',

  properties: [
    {
      class: 'String',
      name: 'message'
    }
  ]
});
