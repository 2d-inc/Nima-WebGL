## Nima-WebGL
Javascript ES6 runtime with WebGL rendering.

## Building
Use NPM to get the dependencies and then build with webpack:

```
npm install
webpack --watch
```

## Usage
Take a look at example/archer.html for a pretty complete use case.

### Create a rendering context to draw to.
Setting up Nima's OpenGL runtime just requires instancing the Graphics class and passing along a reference to the canvas in your Dom:

```
let canvas = document.getElementById("myCanvas");
let graphics = new Nima.Graphics(canvas)
```
### Loading a Nima WebGL Exporter Character
First load a character file into a runtime actor that can be used to then create multiple instances of the character.

```
// Instance a loader.
let loader = new Nima.ActorLoader();
loader.load("/my-character.nima", function(actor)  
{
	if(!actor || actor.error)  
	{
		console.error("Failed to load actor.");  
		return;
	}
	
	// Initialize the actor with the graphics class, this allows loading any shared resources like images and vertex/index buffers that can be shared across multiple instances of the character.
	actor.initialize(graphics);
});
```
	
### Instancing an Actor
Once the Actor has been initialized, it's ready to be instanced and drawn into your scene. Create an instance of an actor as necessary for your project, instances are pretty lightweight and are designed to be created and destroyed at runtime as needed.

```
let actorInstance = actor.makeInstance();
actorInstance.initialize(graphics);
```

### Advancing and Rendering Actor Instances
As your game loop updates, you'll want to apply animations and update each instance before rendering it to the screen such that all the necessary calculations are performed in a batched and efficient way.

```
let animationTime = 0.0;
let animation = actor.getAnimation("Run");
function renderLoop(elapsedSeconds)
{
	animationTime += elapsedSeconds;	
	// Apply the run animation at a specific time on the actor instance. Note that you can layer animations in order here and even applying mixing values into the last argument.
	animation.apply(animationTime, actorInstance, 1.0);
	
	// N.B. any transformations you wish to manually apply to the actorInstance should be applied before calling advance.
	
	// Call advance once per frame on each instance before drawing it.
	actorInstance.advance(elapsedSeconds);
	
	// Draw the instance to the screen.
	actorInstance.draw(graphics);
}
```


### Make sure to call .dispose
Actor and ActorInstance objects should be disposed of once you are done using them. This will free up any graphics memory that was used up by the Actor.

```
actor.dispose(graphics);
actorInstance.dispose(graphics);
```


## Contributing
1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request.

## License
See the [LICENSE](LICENSE) file for license rights and limitations (MIT).
