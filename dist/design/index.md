# tap•compose

[tap•compose](https://www.tapcompose.com)

Tap•compose is autocomplete for music composition. It is a browser-based tool that allows you to write a musical score with chords and a melody bar by bar, where the last bar is auto-suggested.

Quick links:
* [tap•compose](https://www.tapcompose.com): implementation website
* [GitHub](https://github.com/freedmand/tapcompose): source code

[ YOUTUBE ]

## Design

I initially conceived of tapcompose as a tool that would utilize artificial intelligence to construct a melody and chords bar by bar. Per the advice of my music and computer design instructor Ge Wang, I emphasized building a good interface that would bridge an imperfect AI with an intentioned human.

I ended up building a really good interface for taking automatically suggested notes and chords, playing them back, editing them, and accepting them to advance the score. In the end, I realized that a dummy interface that only gave random suggestions within the bounds of a simple song in Western music was good enough given the level of control the interface affords the user.

For now, I have decided to keep the primary suggestion intelligence entirely AI-free, providing completely random suggestions. Combined with human judgment, the tool allows the user to iterate quickly on random ideas and keep or modify the ones that stick.

The design and code is well-documented, modular, and open source and is aimed to eventually support other suggesting modules, harmonic systems, and polyphonic melody.

### Autocomplete

I conceived of the automatic suggestions to be akin to composing a text message on a smartphone. Instead of autocompleting words, tapcompose autocompletes musical bars with melody and chords. Unlike smartphone autocomplete, the interface allows the user to quickly iterate through different suggestions, providing auditory feedback in realtime.

### Score Interface

The tapcompose score interface is heavily inspired by Sibelius, a proprietary music engraving program. I borrowed the notions of hearing the note as you click it, being able to use the arrow keys to change the note and shift to adjacent notes with live audio feedback, and seeing a vertical playback cursor that indicates the playback position.

I believe I have simplified the interface from Sibelius a little by only keeping track of a selected note while the score is not playing. Selecting a note moves the playhead to that note. In Sibelius, the selected note and playhead can be disparate, which I think complicates things.

[ SCREENSHOTS ]

### An online tool

I designed tapcompose to run in a modern frontend browser without any dependencies, in order for it to be easy to universally create and share pieces created with the tool. The entire frontend after minification comes to around 300kB, which is relatively small and snappy by modern standards.

The beauty of tapcompose's notation is owed to [Vexflow](http://www.vexflow.com/), an open-source music engraving library written in JavaScript.

### Mobile

While not yet implemented, the mobile interface for tapcompose is prototyped in detail. I plan to make tapcompose work for smartphones after ironing out all the bugs related to WebAudio playback on mobile. The mobile interface will feature contextual buttons that appear depending on the mode and provide direction on what to do.

The main interface will provide a "shuffle" and "accept" button for controlling the suggester. A fine-tuning interface will allow individual notes to be manipulated.

[ SCREENSHOTS ]

### Name

I chose the name "tapcompose" because it seemed to indicate a really seamless way of composing music. Also the .com URL was available.

I generated the name using a character-level recurrent neural network trained on hundreds of thousands of startup names. By training and running the network backwards, I was able to generate names ending in "compose" and found "tapcompose" among the first results. (But more on that tool another time.)

Iterations on the logo design:

[ LOGO PICTURES ]

## Implementation Details

The abstractions of tapcompose are designed to encapsulate a wide range of possible musical behavior and support future work.

### Instruments

Instruments are polyphonic and provide two methods:

* a noteOn call that takes a handle and a frequency
* a noteOff call that take a handle

The handle is an arbitrary string that can be used to reference the note later to turn it off. For instance, the frequency 440Hz could be played under the handle `A4`. To stop playing the note, the noteOff method would be called with handle `A4`.

Instruments are initialized with the desired degree of polyphony. The base instrument class is extensible and several subclasses are implemented that use the WebAudio API to generate pitched noises. The main composition interface should eventually allow toggling between different instruments.

### Notes

Notes are implemented in {2,3}-space, which was taught to me by [Beth Chen](https://www.seas.harvard.edu/directory/bethchen). This is a 2-dimensional coordinate space in which the x-axis corresponds to increments of an octave (1st overtone) and the y-axis corresponds to increments of an octave-and-a-fifth (2nd overtone). Coordinate (0,0) is set to D at octave 0.

With the power of these musical building blocks, any note can be represented as a pair of integers. This space allows notes to be calculated in a cohesive mathematical system. An interval can be applied to any note, and it can be calculated with relatively simple modular arithmetic.

The advantage of this coordinate space is it does not treat pitch as a linear semitone -- in {2,3}-space C#0 and Db0 are two separate notes. This allows the system to more accurately represent a system of music theory.

### Contextual Chords

Contextual chords are chords, or an array of notes, that carry a name, a scale degree, and an appropriate scale for melodies over the chord. As an example, a dominant V (five) chord in a minor key will have a scale degree of 5, a name of
'7', and a harmonic minor scale starting on the 1. The scale corresponds to notes that are sensible to play over the chord in a given key signature.

An entire musical context can be represented by constructing lists of chords, their scale degrees, names, and scales. The suggester can pick one of these contextual chords at random and use the scale information to sample the melody notes.

### Arpeggiation

Arpeggiation patterns define the groove that is played for each chord. An arpeggiation pattern is specified in a step sequencer fashion, as a 2-dimensional grid. Each column corresponds to a time step, and each row corresponds to a particular chord degree and octave shift.

For instance, a C major chord may contain notes `C2`, `E2`, `G2`. The chord degree 0 would correspond to `C2`, 1 to `E2`, and 2 to `G2`. The degrees wrap around and shift octaves, so a degree of 3 would be `C3` and -1 `G1`. In each row, chord degree and octave shift can both be specified.

These patterns are highly configurable and can work for chords with different amounts of notes. For instance, if you only wanted the root and final chord degree to play in an arpeggio, you could have the first row correspond to chord degree 0 and octave shift 0, and the second row correspond to chord degree -1 and octave shift 1.

### Schedulers

To play notes and chords with a strict sense of time, schedulers are used. Schedulers store hierarchical groups of notes that can be played at different beat offsets. Schedulers keep track of tempo and translate from time offsets to beats.

A scheduler provides methods to play(), pause(), and set the beat offset. The interface is abstract enough to schedule any function to be called at the specified beat offset. Groups of notes can be converted into a performance group, which specifies an instrument and creates events that call the instrument's noteOn and noteOff methods to play the piece.

### Suggesters

Suggesters are abstract interfaces that, at a base level, suggest certain probabilistic outcomes. Suggesters provide methods for advancing the suggestion and accessing the entire history of past accepted suggestions. The base suggesters in tapcompose generate random chords within a musical key signature, random rhythms from a simple set, and random melodies that are in key.

The suggester interface is designed to be extensible. Each suggester outcome is a probability distribution -- in the current implementation, the chosen note is always given 100%. In future work, an artificial intelligence algorithm could return the entire probability distribution it used for each note, each chord, each rhythm, etc. The suggester would keep track of this distribution. The probability information could be revealed to the user in some way to guide the compositional process.

### Score

The process of going from a group of notes to a rendered score is detailed and passes through several phases:

* the notes are converted to the minimum number of voices required, where a voice is a sequential, non-overlapping line of notes and rests
* the voices are segmented by bar
* the bar-aligned voices are rendered by Vexflow, the JavaScript score engraving library
* the rendered notes are linked within a tapcompose score object to their underlying representations and endowed with dynamic functionality

The tapcompose score object keeps track of a lot of things at once, links all the aforementioned interfaces together cohesively, rerenders as needed, and provides methods to serialize and deserialize the result.

### Mobile compatibility

While tapcompose is not yet ready for mobile, I have dealt with some WebAudio inconsistencies by providing a compatibility class that wraps a WebAudio context and goes through some hackery to make it work on mobile.

Specifically on an iPhone, a WebAudio context cannot be created unless in response to a touch event. In order to play sounds while an iPhone is muted, an audio element has to have played. To this end, an empty clip is played both with WebAudio and HTML audio in response to a touch event, and the audio context is released only after both these conditions are met. To keep the context from periodically being suspended, which happens on iPhone, a recurring callback renews the context at frequent intervals.
