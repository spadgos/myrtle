/*globals jQuery, test, module, expect, equal, ok, Myrtle, notStrictEqual, strictEqual */
jQuery(function ($) {
    var Cls, undef;

    Cls = function () {
        this.x = 10;
    };
    Cls.prototype.add = function (y) {
        return this.x + y;
    };
    Cls.prototype.sub = function (y) {
        return this.x - y;
    };
    module("Spying, stubbing, profiling");
    
    test("Myrtle will only instrument functions once", function () {
        var obj = new Cls(),
            fnInfo
        ;
        fnInfo = Myrtle.spy(obj, 'add');
        
        strictEqual(Myrtle.spy(obj, 'add'), fnInfo, "The same object should be returned.");
        
        Myrtle.releaseAll();
    });
    test("Myrtle tracks which functions are mocked", function () {
        var obj = new Cls(),
            obj2 = new Cls(),
            fnInfo,
            origFn
        ;
        origFn = obj.add;
        Myrtle.spy(obj, 'add');
        Myrtle.spy(obj, 'sub');
        
        notStrictEqual(obj.add, origFn, "The object's function should have been replaced.");
        
        equal(Myrtle.size(), 2, "There should be two functions being tracked.");
        
        Myrtle.spy(obj2, 'add');
        fnInfo = Myrtle.spy(obj2, 'sub');
        
        equal(Myrtle.size(), 4, "There should be four functions being tracked.");
        
        fnInfo.release();
        
        equal(Myrtle.size(), 3, "Releasing a meta info object should reduce the size");
        
        Myrtle.releaseAll();
        
        equal(Myrtle.size(), 0, "Release all should work.");
        
        strictEqual(obj.add, origFn, "The original function should have been restored.");
    });
    
    test("Functions on the prototype are restored properly", function () {
        var obj = new Cls(),
            fnInfo
        ;
        
        equal(obj.hasOwnProperty('add'), false, "Sanity check failed. Add should exist only on the prototype");
        
        fnInfo = Myrtle.spy(obj, 'add');
        
        fnInfo.release();
        
        equal(obj.hasOwnProperty('add'), false, "The function should still only exist on the prototype.");
    });
    test("Functions on the object are restored properly", function () {
        var obj = new Cls(),
            fnInfo
        ;
        
        obj.times = function (y) {
            return this.x * y;
        };
        
        equal(obj.hasOwnProperty('times'), true, "Sanity check failed. Times should exist only on the prototype");
        
        fnInfo = Myrtle.spy(obj, 'times');
        
        fnInfo.release();
        
        equal(obj.hasOwnProperty('times'), true, "The function should still only exist on the prototype.");
    });
    
    test("Functions can be spied upon", function () {
        var obj = new Cls(),
            fnInfo
        ;
        
        equal(obj.add(1), 11, "Sanity check failed.");
        
        fnInfo = Myrtle.spy(obj, 'add');
        
        equal(obj.add(1), 11, "The function should behave just as before.");

        obj.add(2);
        obj.add(3);
        equal(obj.add(4), 14, "The function should still keep working.");
        
        equal(fnInfo.callCount(), 4, "Myrtle should have counted 4 calls to add");
        
        equal(fnInfo.lastReturn(), 14, "The last return value should have been stored.");
        
        equal(fnInfo.lastArgs().join(" "), "4", "The last arguments should have been stored.");
        
        fnInfo.reset();
        
        equal(fnInfo.callCount(), 0, "Reset should have reset the call history.");
        
        fnInfo.release();
        
        equal(obj.add(5), 15, "The function should continue working afterwards.");
    });
    
    test("Functions can be stubbed out", function () {
        var obj = new Cls(),
            fnInfo
        ;
        
        fnInfo = Myrtle.stub(obj, 'add');
        
        strictEqual(obj.add(3), undef, "The function should be stubbed out and return nothing.");
        
        fnInfo.release();
        
        strictEqual(obj.add(3), 13, "The function should be restored.");
    });
    test("Functions can be replaced", function () {
        var obj = new Cls(),
            fnInfo,
            replaceA,
            replaceB
        ;
        replaceA = function (orig, y) {
            return -orig(y);
        };
        replaceB = function (orig, y) {
            return 42;
        };
        
        fnInfo = Myrtle.stub(obj, 'add', replaceB);
        
        strictEqual(obj.add(3), 42, "The function should have been replaced with the supplied function.");
        
        Myrtle.stub(obj, 'add', replaceA);
        
        strictEqual(obj.add(3), -13, "The stub function should be able to call the original function.");
        
        fnInfo.release();
        
        strictEqual(obj.add(3), 13, "The stub should be able to be removed.");
    });
    
    test("Functions can be profiled", function () {
        var obj, fnInfo, history;
        obj = {
            fn : function (x) {
                var out = 0, i;
                for (i = x; i--;) {
                    out += i;
                }
                return out;
            }
        };
        fnInfo = Myrtle.profile(obj, 'fn');
        
        obj.fn(1);
        obj.fn(100000);
        obj.fn(1000);
        
        ok(typeof fnInfo.getAverageTime() === 'number', "getAverageTime should return a number.");
        
        history = fnInfo.getHistory();
        
        equal(history.length, 3, "There should be three history elements");
        
        equal(fnInfo.getSlowest(), history[1]);
        equal(fnInfo.getQuickest(), history[0]);
    });
    
    test("The function context is stored by spies", function () {
        var obj = new Cls(),
            other = {
                x : 100
            },
            handle
        ;
        
        handle = Myrtle.spy(obj, 'add');
        obj.add(3);
        strictEqual(handle.lastThis(), obj, "The last context was not stored properly.");
        
        strictEqual(obj.add.call(other, 3), 103, "The custom context was not passed to the function");
        
        strictEqual(handle.lastThis(), other, "The custom context was not stored.");
        
        handle.release();
    });
    
    test("Errors thrown by the method are stored by the spy", function () {
        var obj, handle, err, errorThrown;
        
        obj = {
            foo : function () {
                throw err;
            },
            bar : function () {
                return "hello";
            }
        };
        err = {};
        
        handle = Myrtle.spy(obj, 'foo');
        
        try {
            errorThrown = false;
            obj.foo();
        } catch (e) {
            errorThrown = true;
            strictEqual(e, err, "The error was not thrown properly");
        }
        ok(errorThrown, "The catch block was not executed.");
        
        strictEqual(handle.lastError(), err, "The thrown error was not stored.");
        
        handle.release();
        
        handle = Myrtle.spy(obj, 'bar');
        
        obj.bar();
        
        strictEqual(typeof handle.lastError(), "undefined", "There should have been no error trapped.");
    });
    
    module("Fake timers");
    
    test("Myrtle can fake setTimeout", function () {
        var obj, handle;
        obj = {
            foo : function () {}
        };
        
        handle = Myrtle.spy(obj, 'foo');
        
        Myrtle.fakeTimers();
        
        setTimeout(function () {
            obj.foo();
        }, 100);
        
        strictEqual(handle.callCount(), 0, "The function should not have executed yet.");
        
        Myrtle.tick(200);
        
        strictEqual(handle.callCount(), 1, "The function should have been executed now.");
        
        handle.release();
        
        Myrtle.realTimers();
    });
    
    test("Multiple timeouts are handled", function () {
        var obj, handle;
        obj = {
            foo : function () {}
        };
        handle = Myrtle.spy(obj, 'foo');
        Myrtle.fakeTimers();
        
        setTimeout(obj.foo, 100);
        setTimeout(obj.foo, 100);
        
        setTimeout(obj.foo, 200);
        
        Myrtle.tick(50);
        
        strictEqual(handle.callCount(), 0, "None should have been called yet");
        
        Myrtle.tick(50);
        
        strictEqual(handle.callCount(), 2, "The two functions at 100ms should have been called.");

        setTimeout(obj.foo, 100);

        Myrtle.tick(100);
        
        strictEqual(handle.callCount(), 4, "The two functions at 200ms should have been called.");
        
        setTimeout(obj.foo, 0);
        
        Myrtle.tick(0);
        strictEqual(handle.callCount(), 5, "The zero-ms timeout should have been called.");
        
        handle.release();
        Myrtle.realTimers();
    });
    
    test("Fake timers can be cleared", function () {
        var obj, handle, t1, t2, t3;
        obj = {
            foo : function () {}
        };
        handle = Myrtle.spy(obj, 'foo');
        Myrtle.fakeTimers();
        
        t1 = setTimeout(obj.foo, 50);
        t2 = setTimeout(obj.foo, 100);
        t3 = setTimeout(obj.foo, 150);
        
        clearTimeout(t1);
        clearTimeout(t3);
        
        Myrtle.tick(200);
        
        strictEqual(handle.callCount(), 1, "Only one of the timers should have been executed.");
        
        handle.release();
        Myrtle.realTimers();
    });
});
