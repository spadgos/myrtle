## Myrtle is a Javascript mocking framework ##

- Mocking (spying and stubbing functions)
- Mock function generation
- Timer manipulation
- Speed profiling

- [Full documentation for this is on the wiki](http://github.com/spadgos/myrtle/wiki).
- Myrtle has a sister project called **Tyrtle** which you might also like!

---------------

### Tyrtle is a Javascript unit testing framework ###

Tyrtle has been designed for simplicity and legibility, with minimal pollution of the global namespace.

[Check it out](https://github.com/spadgos/tyrtle).

Here's an example of how you can write an assertion:

    assert.that(Math.sqrt(49)).is(7).since("The square root of 49 should be 7");

If that's too much typing for you, it's good to know that much of the above is actually just syntactic sugar: `that`, `is` and `since` are all completely optional! If you prefer a terser syntax, the exact same assertion can be written like this:

    assert(Math.sqrt(49))(7)("The square root of 49 should be 7");
