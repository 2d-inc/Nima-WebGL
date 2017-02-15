var ActorImage = (function ()
{
	function ActorImage()
	{
		ActorNode.call(this);
		this._DrawOrder = 0;
		this._BlendMode = ActorImage.BlendModes.Normal;
		this._AtlasIndex = -1;
		this._NumVertices = 0;
		this._HasVertexDeformAnimation = false;
		this._AnimationDeformedVertices = null;
		this._Vertices = null;
		this._Triangles = null;
		this._ConnectedBones = null;
		this._BoneMatrices = null;
		this._IsInstance = false;

		this._VertexBuffer = null;
		this._IndexBuffer = null;
		this._DeformVertexBuffer = null;
	}

	/*ActorImage.prototype = 
	{ 
		constructor:ActorImage,
		get hasVertexDeformAnimation() 
		{ 
			return this._HasVertexDeformAnimation; 
		},
		set hasVertexDeformAnimation(value)
		{
			this._HasVertexDeformAnimation = value;
			this._AnimationDeformedVertices = new Float32Array(this._NumVertices * 2);

			// Copy the deform verts from the rig verts.
			var writeIdx = 0;
			var readIdx = 0;
			var readStride = this._VertexStride;
			for(var i = 0; i < this._NumVertices; i++)
			{
				this._AnimationDeformedVertices[writeIdx++] = this._Vertices[readIdx];
				this._AnimationDeformedVertices[writeIdx++] = this._Vertices[readIdx+1];
				readIdx += readStride;
			}
		}
	};*/


	ActorImage.defineProperties = function(prototype)
	{
		ActorNode.defineProperties(prototype);

		Object.defineProperties(prototype,
		{
			hasVertexDeformAnimation:
			{
				get: function()
				{
					return this._HasVertexDeformAnimation;
				},
				set: function(value)
				{
					this._HasVertexDeformAnimation = value;
					this._AnimationDeformedVertices = new Float32Array(this._NumVertices * 2);

					// Copy the deform verts from the rig verts.
					var writeIdx = 0;
					var readIdx = 0;
					var readStride = this._VertexStride;
					for(var i = 0; i < this._NumVertices; i++)
					{
						this._AnimationDeformedVertices[writeIdx++] = this._Vertices[readIdx];
						this._AnimationDeformedVertices[writeIdx++] = this._Vertices[readIdx+1];
						readIdx += readStride;
					}
				}
			}
		});
	};

	ActorImage.defineProperties(ActorImage.prototype);

	ActorNode.subclass(ActorImage);
	
	ActorImage.BlendModes = 
	{
		"Normal":0,
		"Multiply":1,
		"Screen":2,
		"Additive":3
	};

	ActorImage.prototype.dispose = function(actor, graphics)
	{
		if(this._IsInstance)
		{
			if(this._DeformVertexBuffer)
			{
				this._DeformVertexBuffer.dispose();
				this._DeformVertexBuffer = null;
			}
		}
		else
		{
			if(this._VertexBuffer)
			{
				this._VertexBuffer.dispose();
				this._VertexBuffer = null;
			}
			if(this._IndexBuffer)
			{
				this._IndexBuffer.dispose();
				this._IndexBuffer = null;
			}

		}
	};

	ActorImage.prototype.initialize = function(actor, graphics)
	{
		if(!this._IsInstance)
		{
			this._VertexBuffer = graphics.makeVertexBuffer(this._Vertices);
			this._IndexBuffer = graphics.makeIndexBuffer(this._Triangles);
		}
		else if(this._HasVertexDeformAnimation)
		{
			this._DeformVertexBuffer = graphics.makeVertexBuffer(this._AnimationDeformedVertices);
		}

		if(this._IsInstance && this._ConnectedBones)
		{
			var bt = this._BoneMatrices = new Float32Array((this._ConnectedBones.length+1) * 6);

			// First bone transform is always identity.
			bt[0] = 1;
			bt[1] = 0;
			bt[2] = 0;
			bt[3] = 1;
			bt[4] = 0;
			bt[5] = 0;
		}
		delete this._Vertices;
		delete this._Triangles;

		this._Texture = actor._Atlases[this._AtlasIndex];
	};

	ActorImage.prototype.advance = function()
	{
		if(this._HasVertexDeformAnimation && this._VerticesDirty)
		{
			this._DeformVertexBuffer.update(this._AnimationDeformedVertices);
			this._VerticesDirty = false;
		}

		if(this._ConnectedBones)
		{
			var bt = this._BoneMatrices;
			var bidx = 6; // Start after first identity.

			var mat = mat2d.create();

			for(var i = 0; i < this._ConnectedBones.length; i++)
			{
				var cb = this._ConnectedBones[i];

				cb.node.updateTransforms();
				var wt = mat2d.mul(mat, cb.node.getWorldTransform(), cb.ibind);

				bt[bidx++] = wt[0];
				bt[bidx++] = wt[1];
				bt[bidx++] = wt[2];
				bt[bidx++] = wt[3];
				bt[bidx++] = wt[4];
				bt[bidx++] = wt[5];
			}
		}
	};

	ActorImage.prototype.draw = function(graphics)
	{
		var t = this._WorldTransform;
		switch(this._BlendMode)
		{
			case ActorImage.BlendModes.Normal:
				graphics.enableBlending();
				break;
			case ActorImage.BlendModes.Multiply:
				graphics.enableMultiplyBlending();
				break;
			case ActorImage.BlendModes.Screen:
				graphics.enableScreenBlending();
				break;
			case ActorImage.BlendModes.Additive:
				graphics.enableAdditiveBlending();
				break;

		}
		if(this._ConnectedBones)
		{
			if(this._DeformVertexBuffer)
			{
				graphics.drawTexturedAndDeformedSkin(t, this._DeformVertexBuffer, this._VertexBuffer, this._IndexBuffer, this._BoneMatrices, this._RenderOpacity, [1.0, 1.0, 1.0, 1.0], this._Texture);
			}
			else
			{
				graphics.drawTexturedSkin(t, this._VertexBuffer, this._IndexBuffer, this._BoneMatrices, this._RenderOpacity, [1.0, 1.0, 1.0, 1.0], this._Texture);
			}
		}
		else
		{
			if(this._DeformVertexBuffer)
			{
				graphics.drawTexturedAndDeformed(t, this._DeformVertexBuffer, this._VertexBuffer, this._IndexBuffer, this._RenderOpacity, [1.0, 1.0, 1.0, 1.0], this._Texture);
			}
			else
			{
				graphics.drawTextured(t, this._VertexBuffer, this._IndexBuffer, this._RenderOpacity, [1.0, 1.0, 1.0, 1.0], this._Texture);
			}
		}
	};

	ActorImage.prototype.resolveComponentIndices = function(components)
	{
		ActorNode.prototype.resolveComponentIndices.call(this, components);

		if(this._ConnectedBones)
		{
			for(var j = 0; j < this._ConnectedBones.length; j++)
			{
				var cb = this._ConnectedBones[j];
				cb.node = components[cb.componentIndex];
				cb.node._IsConnectedToImage = true;
			}
		}
	};

	ActorImage.prototype.makeInstance = function(resetActor)
	{
		var node = new ActorImage();
		node._IsInstance = true;
		ActorImage.prototype.copy.call(node, this, resetActor);
		return node;	
	};

	ActorImage.prototype.copy = function(node, resetActor)
	{
		ActorNode.prototype.copy.call(this, node, resetActor);

		this._DrawOrder = node._DrawOrder;
		this._BlendMode = node._BlendMode;
		this._AtlasIndex = node._AtlasIndex;
		this._NumVertices = node._NumVertices;
		this._VertexStride = node._VertexStride;
		this._HasVertexDeformAnimation = node._HasVertexDeformAnimation;
		this._Vertices = node._Vertices;
		this._Triangles = node._Triangles;
		// N.B. actor.initialize must've been called before instancing.
		this._VertexBuffer = node._VertexBuffer;
		this._IndexBuffer = node._IndexBuffer;
		if (node._HasVertexDeformAnimation)
		{
			var deformedVertexLength = this._NumVertices * 2;
			this._AnimationDeformedVertices = new Float32Array(deformedVertexLength);
			for(var i = 0; i < deformedVertexLength; i++)
			{
				this._AnimationDeformedVertices[i] = node._AnimationDeformedVertices[i];
			}
		}

		if(node._ConnectedBones)
		{
			this._ConnectedBones = [];
			for(var i = 0; i < node._ConnectedBones.length; i++)
			{
				var cb = node._ConnectedBones[i];
				// Copy all props except for the actual node reference which will update in our resolve.
				this._ConnectedBones.push({
						componentIndex:cb.componentIndex,
						bind:cb.bind,
						ibind:cb.ibind
					});
			}
		}
	};

	return ActorImage;
}());