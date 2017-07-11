import Dispatcher from "./Dispatcher.js";
import ActorNode from "./ActorNode.js";
import ActorImage from "./ActorImage.js";
import ActorIKTarget from "./ActorIKTarget.js";
import AnimationInstance from "./AnimationInstance.js";

export default class Actor extends Dispatcher
{
	constructor()
	{
		super();

		this._Components = [];
		this._Nodes = [];
		this._Images = [];
		this._Atlases = [];
		this._RootNode = new ActorNode();
		this._Components.push(this._RootNode);
		this._Nodes.push(this._RootNode);
		this._Animations = [];
		this._Solvers = [];
		this._IsInstance = false;
		this._IsImageSortDirty = false;
	}

	get root()
	{
		return this._RootNode;
	}

	resolveHierarchy(graphics)
	{
		let components = this._Components;
		for(let component of components)
		{
			if(component != null)
			{
				component.resolveComponentIndices(components);
				if(component.isNode)
				{
					this._Nodes.push(component);
				}
				switch(component.constructor)
				{
					case ActorImage:
						this._Images.push(component);
						break;
					case ActorIKTarget:
						this._Solvers.push(component);
						break;
				}
			}
		}

		this._Images.sort(function(a,b)
		{
			return a._DrawOrder - b._DrawOrder;
		});

		this._Solvers.sort(function(a,b)
		{
			return a._Order - b._Order;
		});
	}

	dispose(graphics)
	{
		if(!this._IsInstance)
		{
			let atlases = this._Atlases;
			for(let atlas of atlases)
			{
				graphics.deleteTexture(atlas);
			}
		}
		let images = this._Images;
		for(let image of images)
		{
			image.dispose(this, graphics);
		}
	}

	initialize(graphics)
	{
		if(!this._IsInstance)
		{
			// Load all the atlases.
			let atlases = this._Atlases;
			for(let i = 0; i < atlases.length; i++)
			{
				let atlas = atlases[i];
				atlases[i] = graphics.loadTexture(atlas);
			}
		}
		let images = this._Images;
		for(let image of images)
		{
			image.initialize(this, graphics);
		}
	}

	advance(seconds)
	{
		// First iterate solvers to see if any is dirty.
		let solvers = this._Solvers;
		let runSolvers = false;
		for(let solver of solvers)
		{
			if(solver.needsSolve())
			{
				runSolvers = true;
				break;
			}
		}

		let nodes = this._Nodes;
		for(let node of nodes)
		{
			if(node)
			{
				node.updateTransforms();
			}
		}

		if(runSolvers)
		{
			for(let solver of solvers)
			{
				solver.solveStart();
			}	

			for(let solver of solvers)
			{
				solver.solve();
			}

			for(let solver of solvers)
			{
				solver._SuppressMarkDirty = true;
			}

			for(let node of nodes)
			{
				if(node)
				{
					node.updateTransforms();
				}
			}

			for(let solver of solvers)
			{
				solver._SuppressMarkDirty = false;
			}
		}

		let components = this._Components;
		// Advance last (update graphics buffers and such).
		for(let component of components)
		{
			if(component)
			{
				component.advance(seconds);
			}
		}

		if(this._IsImageSortDirty)
		{
			this._Images.sort(function(a,b)
			{
				return a._DrawOrder - b._DrawOrder;
			});
			this._IsImageSortDirty = false;
		}
	}

	draw(graphics)
	{
		let images = this._Images;
		for(let image of images)
		{
			image.draw(graphics);
		}
	}

	getNode(name)
	{
		let nodes = this._Nodes;
		for(let node of nodes)
		{
			if(node._Name === name)
			{
				return node;
			}
		}
		return null;
	}

	getAnimation(name)
	{
		let animations = this._Animations;
		for(let animation of animations)
		{
			if(animation._Name === name)
			{
				return animation;
			}
		}
		return null;
	}

	getAnimationInstance(name)
	{
		let animation = this.getAnimation(name);
		if(!animation)
		{
			return null;
		}
		return new AnimationInstance(this, animation);
	}

	makeInstance()
	{
		let actorInstance = new Actor();
		actorInstance._IsInstance = true;
		actorInstance.copy(this);
		return actorInstance;
	}

	copy(actor)
	{
		let components = actor._Components;
		this._Animations = actor._Animations;
		this._Atlases = actor._Atlases;
		this._Components.length = 0;
		for(let component of components)
		{
			if(!component)
			{
				this._Components.push(null);
				continue;
			}
			let instanceNode = component.makeInstance(this);
			switch(instanceNode.constructor)
			{
				case ActorImage:
					this._Images.push(instanceNode);
					break;

				case ActorIKTarget:
					this._Solvers.push(instanceNode);
					break;
			}
			if(instanceNode.isNode)
			{
				this._Nodes.push(instanceNode);
			}
			this._Components.push(instanceNode);
		}
		this._RootNode = this._Components[0];

		for(let i = 1; i < this._Components.length; i++)
		{
			let component = this._Components[i];
			if(component == null)
			{
				continue;
			}
			component.resolveComponentIndices(this._Components);
		}

		this._Images.sort(function(a,b)
		{
			return a._DrawOrder - b._DrawOrder;
		});

		this._Solvers.sort(function(a,b)
		{
			return a._Order - b._Order;
		});
	}
}