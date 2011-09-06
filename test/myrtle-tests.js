/*globals jQuery, test, module, expect, equal, ok, Myrtle, notStrictEqual, strictEqual, raises */
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
        
        equal(obj.times(3), 30, "The times function should still work after being spied.");
        
        fnInfo.release();
        
        equal(obj.hasOwnProperty('times'), true, "The function should still only exist on the prototype.");
        
        equal(obj.times(4), 40, "The times function should work after being restored.");
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
        
        fnInfo = Myrtle.spy(obj, 'sub');
        
        equal(obj.sub(3), 7, "Other functions should continue to work.");
        
        fnInfo.release();
    });
    
    test("Functions retain their properties", function () {
        var obj = {
            two  : function (a, b) {},
            one  : function (a) {},
            zero : function () {}
        };
        equal(obj.two.length, 2, "Sanity check failed. Function length incorrect.");
        Myrtle.spy(obj, 'two').and(function () {
            equal(obj.two.length, 2, "The arguments list is the incorrect size");
        });
        
        Myrtle.spy(obj, 'one').and(function () {
            equal(obj.one.length, 1, "The arguments list is the incorrect size");
        });
        Myrtle.spy(obj, 'zero').and(function () {
            equal(obj.zero.length, 0, "The arguments list is the incorrect size");
        });
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
    
    test("Only functions can be spied upon", function () {
        var obj = new Cls();
        raises(function () {
            Myrtle.spy(obj, 'x');
        }, /is not a function/);
    });
    
    test("Myrtle knows which methods have been modified", function () {
        var obj = new Cls(),
            handle
        ;
        ok(!Myrtle.hasModified(obj.add));
        handle = Myrtle.spy(obj, 'add');
        ok(Myrtle.hasModified(obj.add));
        handle.release();
        ok(!Myrtle.hasModified(obj.add));
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
    
    test("Myrtle can automatically clean up by using and()", function () {
        var obj = {
            f : function () {}
        };
        Myrtle.spy(obj, 'f').and(function () {
            obj.f();
            equal(this.callCount(), 1);
        });
        ok(!Myrtle.hasModified(obj.f));
        
        raises(function () {
            Myrtle.spy(obj, 'f').and(function () {
                throw 'foo';
            });
        }, /^foo$/);
        ok(!Myrtle.hasModified(obj.f));
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
    
    test("Time is handled properly inside timeouts", function () {
        var obj, foo, bar;
        obj = {
            foo : function () {},
            bar : function () {}
        };
        foo = Myrtle.spy(obj, 'foo');
        bar = Myrtle.spy(obj, 'bar');
        
        Myrtle.fakeTimers();
        
        setTimeout(function () {
            obj.foo();
            setTimeout(function () {
                obj.bar();
            }, 10);
        }, 10);
        
        Myrtle.tick(15);
        
        strictEqual(foo.callCount(), 1, "Foo should have been executed");
        
        Myrtle.tick(5);
        
        strictEqual(bar.callCount(), 1, "Bar should have been executed at 20ms");
        
        Myrtle.realTimers();
        foo.release();
        bar.release();
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
        
        setTimeout(obj.foo, 1);
        
        Myrtle.tick(1);
        strictEqual(handle.callCount(), 5, "The zero-ms timeout should have been called.");
        
        Myrtle.tick(10);
        
        strictEqual(handle.callCount(), 5, "After all have run, they should not run again.");
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
    
    test("Myrtle can fake setInterval", function () {
        var obj, handle;
        obj = {
            foo : function () {}
        };
        handle = Myrtle.spy(obj, 'foo');
        Myrtle.fakeTimers();
        
        setInterval(obj.foo, 10);
        
        strictEqual(handle.callCount(), 0);
        
        Myrtle.tick(10);
        
        strictEqual(handle.callCount(), 1);
        
        Myrtle.tick(10);
        
        strictEqual(handle.callCount(), 2);
        
        Myrtle.tick(20);
        
        strictEqual(handle.callCount(), 4);
        
        Myrtle.tick(200);
        
        strictEqual(handle.callCount(), 24);
        
        handle.release();
        Myrtle.realTimers();
    });
    
    test("Myrtle can clear intervals", function () {
        var obj, foo, bar, baz, t1, t2, t3;
        
        obj = {
            foo : function () {},
            bar : function () {},
            baz : function () {}
        };
        foo = Myrtle.spy(obj, 'foo');
        bar = Myrtle.spy(obj, 'bar');
        baz = Myrtle.spy(obj, 'baz');
        
        Myrtle.fakeTimers();
        
        t1 = setInterval(obj.foo, 5);
        t2 = setInterval(obj.bar, 10);
        t3 = setInterval(obj.baz, 15);
        
        Myrtle.tick(5); // 5
        
        strictEqual(foo.callCount(), 1, "A) Foo should have been called once.");
        strictEqual(bar.callCount(), 0, "A) Bar should not have been called.");
        strictEqual(baz.callCount(), 0, "A) Baz should not have been called.");
        
        Myrtle.tick(5); // 10
        
        strictEqual(foo.callCount(), 2, "B) Foo call count is incorrect");
        strictEqual(bar.callCount(), 1, "B) Bar call count is incorrect");
        strictEqual(baz.callCount(), 0, "B) Baz call count is incorrect");
        
        Myrtle.tick(5); // 15
        
        strictEqual(foo.callCount(), 3, "C) Foo call count is incorrect");
        strictEqual(bar.callCount(), 1, "C) Bar call count is incorrect");
        strictEqual(baz.callCount(), 1, "C) Baz call count is incorrect");
        
        Myrtle.tick(45); // 60
        
        strictEqual(foo.callCount(), 12, "D) Foo call count is incorrect");
        strictEqual(bar.callCount(), 6,  "D) Bar call count is incorrect");
        strictEqual(baz.callCount(), 4,  "D) Baz call count is incorrect");
        
        clearInterval(t1);
        
        Myrtle.tick(10); // 70
        
        strictEqual(foo.callCount(), 12, "E) Foo call count is incorrect");
        strictEqual(bar.callCount(), 7,  "E) Bar call count is incorrect");
        strictEqual(baz.callCount(), 4,  "E) Baz call count is incorrect");
        
        Myrtle.tick(10); // 80
        
        strictEqual(foo.callCount(), 12, "F) Foo call count is incorrect");
        strictEqual(bar.callCount(), 8,  "F) Bar call count is incorrect");
        strictEqual(baz.callCount(), 5,  "F) Baz call count is incorrect");
        
        clearInterval(t2);
        
        Myrtle.tick(10); // 90
        
        strictEqual(foo.callCount(), 12, "G) Foo call count is incorrect");
        strictEqual(bar.callCount(), 8,  "G) Bar call count is incorrect");
        strictEqual(baz.callCount(), 6,  "G) Baz call count is incorrect");
        
        foo.release();
        bar.release();
        baz.release();
        Myrtle.realTimers();
    });
    
    test("Tick only accepts positive integers", function () {
        Myrtle.fakeTimers();
        raises(function () {
            Myrtle.tick(0);
        }, /positive integer/);
        raises(function () {
            Myrtle.tick(-1);
        }, /positive integer/);
        raises(function () {
            Myrtle.tick('hello');
        }, /positive integer/);
        raises(function () {
            Myrtle.tick(50.1);
        }, /positive integer/);
        Myrtle.realTimers();
    });
    
    test("Tick can only be used while fakeTimers are active", function () {
        raises(function () {
            Myrtle.tick(1);
        }, /Fake timers are not currently active/);
    });
    
    test("Fake intervals and timers are clipped to a minimum of 1ms", function () {
        var obj = {
                f : function () {}
            },
            handle = Myrtle.spy(obj, 'f')
        ;
        Myrtle.fakeTimers();
        setTimeout(obj.f, 0);
        setTimeout(obj.f, -1);
        setTimeout(obj.f, null);
        setTimeout(obj.f);
        setTimeout(obj.f, {});
        setTimeout(obj.f, "hello");
        setTimeout(obj.f, "-5");
        
        Myrtle.tick(1);
        
        equal(handle.callCount(), 7, "Each of the timers should have been triggered");
        
        handle.reset();
        
        setInterval(obj.f, 0);
        setInterval(obj.f, -1);
        setInterval(obj.f, null);
        setInterval(obj.f);
        setInterval(obj.f, {});
        setInterval(obj.f, "hello");
        setInterval(obj.f, "-5");
        
        Myrtle.tick(5);
        
        equal(handle.callCount(), 35, "The intervals should have been triggered 5 times each");
        
        Myrtle.realTimers();
        handle.release();
    });
    
    test("Timer values passed to setInterval and setTimeout are parsed as numbers", function () {
        var obj = {
                f : function () {}
            },
            id,
            handle = Myrtle.spy(obj, 'f')
        ;
        Myrtle.fakeTimers();
        setTimeout(obj.f, "1");
        setTimeout(obj.f, "2");
        
        Myrtle.tick(2);
        equal(handle.callCount(), 2, "Both strings should have been parsed as integers");
        
        handle.reset();
        
        setTimeout(obj.f, [5]);
        Myrtle.tick(1);
        equal(handle.callCount(), 0);
        Myrtle.tick(4);
        equal(handle.callCount(), 1, "The array should have been converted to an integer");
        
        handle.reset();
        
        id = setInterval(obj.f, "5");
        Myrtle.tick(10);
        equal(handle.callCount(), 2);
        
        clearInterval(id);
        handle.reset();
 
        id = setInterval(obj.f, [3, 8, 10]); // should end up as 3
        Myrtle.tick(30);
        equal(handle.callCount(), 10);
        clearInterval(id);
        
        Myrtle.realTimers();
        handle.release();
        
    });
    
    test("Faking timers in a closure", function () {
        var obj = {
                fn : function () {},
                closure : function () {
                    var x = false;
                    setTimeout(function () {
                        x = true;
                    }, 1);
                    Myrtle.tick(1);
                    ok(x);
                }
            },
            handleClosure = Myrtle.spy(obj, 'closure'),
            handleFn = Myrtle.spy(obj, 'fn')
        ;
        
        Myrtle.fakeTimers(obj.closure);
        equal(handleClosure.callCount(), 1);
        
        raises(function () {
            Myrtle.tick(1);
        }, /Fake timers are not currently active/);
        
        Myrtle.releaseAll();
    });
    
    test("Fake timers are automatically cleaned up when errors are thrown", function () {
        raises(function () {
            Myrtle.fakeTimers(function () {
                throw "foo";
            });
        }, /^foo/);
        raises(function () {
            Myrtle.tick(1);
        }, /Fake timers are not currently active/);
    });
    
    module("Function generators");
    
    test("Functions can be given basic inputs and return values using when and then", function () {
        var f = Myrtle.fn().when(3).then(9).when(4).then(16);
        strictEqual(f(3), 9);
        strictEqual(f(4), 16);
        strictEqual(typeof f(5), "undefined");
    });
    test("Functions can use undefined values", function () {
        var f = Myrtle.fn().when().then("foo").when('bar').then();
        strictEqual(f(), "foo");
        strictEqual(typeof f('bar'), "undefined");
    });
    
    test("Functions can have an otherwise", function () {
        var f = Myrtle.fn().when(3).then(9).otherwise(10).when(6).then(11);
        strictEqual(f(3), 9);
        strictEqual(f(4), 10);
        strictEqual(f(5), 10);
        strictEqual(f(6), 11);
    });
    
    test("Functions can pass multiple arguments to when", function () {
        var f = Myrtle.fn()
            .when().then('a')
            .when(1).then('b')
            .when(1, 2).then('c')
            .when(1, 2, 3).then('d')
            .otherwise('e')
        ;
        strictEqual(f(), 'a');
        strictEqual(f(1), 'b');
        strictEqual(f(1, 2), 'c');
        strictEqual(f(1, 2, 3), 'd');
        strictEqual(f(1, 2, 3, 4), 'e');
    });
    
    test("Incorrect usage of function builders throws errors", function () {
        var count = 0, expected = 0;
        raises(function () {
            Myrtle.fn().when().when();
        }, /can not be used/);
        
        raises(function () {
            Myrtle.fn().then();
        }, /can only be used/);
        
        raises(function () {
            Myrtle.fn().when(1).otherwise();
        }, /can not be used/);
        
        raises(function () {
            Myrtle.fn().otherwise().then(3);
        }, /can only be used/);
        
        raises(function () {
            Myrtle.fn().run();
        }, /can only be used/);
    });
    
    test("Reuse of when clause is last-in-first-out", function () {
        var f = Myrtle.fn()
            .when(1).then(false)
            .when(1).then(true)
            .otherwise(false)
            .otherwise(true)
        ;
        ok(f(1), "Last when is not being used.");
        ok(f(), "Last otherwise is not being used.");
    });
    
    test("Custom functions can be executed", function () {
        var f = Myrtle.fn()
            .when(1).run(function (a) {
                return 100 + a;
            })
            .when(2).run(function (a) {
                return 2 * a;
            })
        ;
        equal(f(1), 101);
        equal(f(2), 4);
        equal(typeof f(3), "undefined");
    });
    
    test("Custom functions can be executed by otherwise", function () {
        var f = Myrtle.fn()
            .when(1).then(10)
            .otherwise().run(function () {
                if (arguments.length === 1) {
                    return arguments[0];
                } else {
                    return arguments[0] + arguments[1];
                }
            })
        ;
        equal(f(1), 10);
        equal(f(2), 2);
        equal(f(3, 4), 7);
    });
    
    test("Custom functions are executed in the right scope", function () {
        var obj = {
            x : 3,
            y : 4,
            f : Myrtle.fn()
                .when('add').run(function (a) {
                    return a + " = " + (this.x + this.y);
                })
                .when('multiply').run(function (a) {
                    return a + " = " + (this.x * this.y);
                })
                .otherwise().run(function (a) {
                    return a + " = " + (this.y * 10 + this.x - 1);
                })
        };
        equal(obj.f('add'), "add = 7");
        equal(obj.f('multiply'), "multiply = 12");
        equal(obj.f('life, the universe, and everything'), 'life, the universe, and everything = 42');
    });
    
    test("Built functions can be sealed", function () {
        var f = Myrtle.fn()
            .when(1).then(true)
            .otherwise(true)
            .seal()
            .when(1).then(false)
            .otherwise(false)
        ;
        ok(f(1), "When precondition still used after sealing");
        ok(f(2), "Otherwise clause still used after sealing");
    });
    
    test("Built functions can be exported with get", function () {
        var f = Myrtle.fn()
            .when(1).then(true)
            .otherwise('a')
            .get()
        ;
        ok(!('when' in f) && !('then' in f) && !('otherwise' in f) && !('run' in f) && !('get' in f));
        ok(f(1));
        equal(f(2), 'a');
    });
    
    test("Myrtle can build upon existing functions", function () {
        var orig, f;
        orig = function (a) {
            return 10 + a;
        };
        f = Myrtle.fn(orig).when(1).then(-1);
        
        equal(f(1), -1);
        equal(f(2), 12);
    });
    test("Myrtle stubs handle built functions", function () {
        var obj, handle;
        obj = {
            x : 2,
            y : 3,
            f : function (a) {
                return 100 * a + 10 * this.x + this.y;
            }
        };
        
        Myrtle.spy(obj, 'f');
        
        handle = Myrtle.stub(obj, 'f', Myrtle.fn()
            .when(1).then(10)
            .when(2).run(function (orig, a) {
                return a * 2;
            })
            .when(3).run(function (orig, a) {
                return orig(a) + 1000;
            })
            .otherwise().run(function (orig, a) {
                return 100 * a + 10 * this.x + this.y;
            })
        );
        
        
        equal(obj.f(1), 10, "when.then failed");
        equal(obj.f(2), 4, "when.run failed");
        equal(obj.f(3), 1323, "when.run failed when using the original function");
        equal(obj.f(4), 423, "otherwise.run failed");
        
        equal(handle.callCount(), 4, "The function's call count was not maintained.");
    });
});
