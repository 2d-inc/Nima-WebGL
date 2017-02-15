var ActorIKTarget = (function ()
{
	function ActorIKTarget()
	{
		ActorNode.call(this);

		this._Order = 0;
		this._Strength = 0;
		this._InvertDirection = false;
		this._InfluencedBones = null;


		// Solve properties.
		this._Bone1 = null;
		this._Bone1Child = null;
		this._Bone2 = null;
		this._Chain = null;
	}

	ActorNode.defineProperties(ActorIKTarget.prototype);
	ActorNode.subclass(ActorIKTarget);

	ActorIKTarget.prototype.resolveComponentIndices = function(components)
	{
		ActorNode.prototype.resolveComponentIndices.call(this, components);

		if(this._InfluencedBones)
		{
			for(var j = 0; j < this._InfluencedBones.length; j++)
			{
				var componentIndex = this._InfluencedBones[j];
				if(componentIndex.constructor !== Number)
				{
					componentIndex = componentIndex._Index;
				}

				{
					this._InfluencedBones[j] = components[componentIndex];
					this._InfluencedBones[j]._Dependents.push(this);
				}
			}
		}

		var bones = this._InfluencedBones;
		if(!bones.length)
		{
			return;
		}
		this._Bone1 = bones[0];
		this._Bone2 = bones[bones.length-1];
		var b1c = this._Bone2;
		var b1 = this._Bone1;
		if(bones.length > 1)
		{
			while(b1c && b1c._Parent != b1)
			{
				b1c = b1c._Parent;
			}
		}

		this._Bone1Child = b1c;

		var end = this._Bone2;
		this._Chain = [];
		while(end && end != b1._Parent)
		{
			// if the bone or the parent of the bone is in, then we will manipulate the rotation, so it's in.
			this._Chain.push({bone:end, angle:0, in:bones.indexOf(end) != -1 || bones.indexOf(end._Parent) != -1});
			end = end._Parent;
		}
	};

	ActorIKTarget.prototype.initialize = function()
	{
		var bones = this._InfluencedBones;
		if(!bones.length)
		{
			return;
		}
		this._Bone1 = bones[0];
		this._Bone2 = bones[bones.length-1];
		var b1c = this._Bone2;
		var b1 = this._Bone1;
		if(bones.length > 1)
		{
			while(b1c && b1c._Parent != b1)
			{
				b1c = b1c._Parent;
			}
		}

		this._Bone1Child = b1c;

		var end = this._Bone2;
		this._Chain = [];
		while(end && end != b1._Parent)
		{
			// if the bone or the parent of the bone is in, then we will manipulate the rotation, so it's in.
			this._Chain.push({bone:end, angle:0, in:bones.indexOf(end) != -1 || bones.indexOf(end._Parent) != -1});
			end = end._Parent;
		}
	};

	ActorIKTarget.prototype.needsSolve = function()
	{
		if(this._IsWorldDirty || this._IsDirty)
		{
			return true;
		}
		return false;
	};

	ActorIKTarget.prototype.solveStart = function()
	{
		if(this._Bone1 === null)
		{
			return;
		}

		// Reset all rotation overrides to FK ones,

		if(this._Bone1Child !== this._Bone2)
		{
			this._Bone1Child.overrideRotation(this._Bone1Child._Rotation);
		}

		var bones = this._InfluencedBones;
		for(var i = 0; i < bones.length; i++)
		{
			var b = bones[i];
			b.overrideRotation(b._Rotation);
		}
	};

	function _Solve2(b1, b2, worldTargetTranslation, invert)
	{
		var world = b1._Parent.getWorldTransform();
		var b1c = b2;
		while(b1c && b1c._Parent != b1)
		{
			b1c = b1c._Parent;
		}
		// Transform to root bone space
		if(b1._Parent._Length)
		{
			var t = mat2d.fromTranslation(mat2d.create(), [b1._Parent._Length, 0]);
			world = mat2d.mul(t, world, t);
		}

		var iworld = mat2d.invert(mat2d.create(), world);

		var pA = b1.getWorldTranslation();
		var pC = b1.getTipWorldTranslation();
		var pB = b2.getTipWorldTranslation();
		var pBT = vec2.copy(vec2.create(), worldTargetTranslation);

		var pA = vec2.transformMat2d(pA, pA, iworld);
		var pC = vec2.transformMat2d(pC, pC, iworld);
		var pB = vec2.transformMat2d(pB, pB, iworld);
		var pBT = vec2.transformMat2d(pBT, pBT, iworld);

		// http://mathworld.wolfram.com/LawofCosines.html
		var av = vec2.subtract(vec2.create(), pB, pC);
		var a = vec2.length(av);

		var bv = vec2.subtract(vec2.create(), pC, pA);
		var b = vec2.length(bv);

		var cv = vec2.subtract(vec2.create(), pBT, pA);
		var c = vec2.length(cv);

		var A = Math.acos(Math.max(-1,Math.min(1,(-a*a+b*b+c*c)/(2*b*c))));
		var C = Math.acos(Math.max(-1, Math.min(1,(a*a+b*b-c*c)/(2*a*b))));

		var angleCorrection = 0;
		if(b1c != b2)
		{
			var world2 = b1c.getWorldTransform();
			var iworld2 = mat2d.invert(mat2d.create(), world2);

			var pa2 = b2.getTipWorldTranslation();
			var tipBone2Local = vec2.transformMat2d(pa2, pa2, iworld2);
			var a = Math.atan2(tipBone2Local[1], tipBone2Local[0]);

			angleCorrection = -a;
		}
		if(invert)
		{
			b1.overrideRotation(Math.atan2(pBT[1],pBT[0]) - A);
			b1c.overrideRotation(-C+Math.PI+angleCorrection);
		}
		else
		{
			b1.overrideRotation(A+Math.atan2(pBT[1],pBT[0]));
			b1c.overrideRotation(C-Math.PI+angleCorrection);
		}
	}

	function _Solve1(b1, worldTargetTranslation)
	{
		var world2 = b1.getWorldTransform();
		var iworld2 = mat2d.invert(mat2d.create(), world2);

		var targetLocal = vec2.transformMat2d(vec2.create(), worldTargetTranslation, iworld2);
		var a = Math.atan2(targetLocal[1], targetLocal[0]);

		b1.overrideRotation(b1._OverrideRotation+a);
	}

	ActorIKTarget.prototype.solve = function()
	{
		/*if(this._Bone1 === null || (!this._IsWorldDirty && !this._IsDirty))
		{
			return true;
		}*/

		var worldTargetTranslation = vec2.create();
		var wt = this.getWorldTransform();
		worldTargetTranslation[0] = wt[4];
		worldTargetTranslation[1] = wt[5];
		//if(this._Name === "Foot Left Target")
		//console.log(worldTargetTranslation, this._Name, this._Translation);
		var strength = this._Strength;
		var bones = this._InfluencedBones;
		var chain = this._Chain;
		var tip = this._Bone2;
		var invert = this._InvertDirection;

		for(var i = 0; i < chain.length; i++)
		{
			var fk = chain[i];
			fk.angle = fk.bone._OverrideRotation;
		}

		if(bones.length === 1)
		{
			_Solve1(bones[0], worldTargetTranslation);
		}
		else if(bones.length == 2)
		{
			_Solve2(bones[0], bones[1], worldTargetTranslation, invert);
		}
		else
		{
			for(var i = 0; i < bones.length-1; i++)
			{
				_Solve2(bones[i], tip, worldTargetTranslation);
			}
		}

		// At the end, mix the FK angle with the IK angle by strength
		var m = strength;
		if(m != 1.0)
		{
			var im = 1.0-strength;
			for(var i = 0; i < chain.length; i++)
			{
				var fk = chain[i];
				if(fk.in)
				{
					fk.bone.overrideRotation(fk.bone._OverrideRotation * m + fk.angle * im);
				}
			}
		}

		
	};


	ActorIKTarget.prototype.makeInstance = function(resetActor)
	{
		var node = new ActorIKTarget();
		ActorIKTarget.prototype.copy.call(node, this, resetActor);
		return node;	
	};

	ActorIKTarget.prototype.copy = function(node, resetActor)
	{
		ActorNode.prototype.copy.call(this, node, resetActor);
		

		this._Order = node._Order;
		this._Strength = node._Strength;
		this._InvertDirection = node._InvertDirection;
		this._InfluencedBones = [];
		for (var i = 0; i < node._InfluencedBones.length; i++)
		{
			var ib = node._InfluencedBones[i];
			if(ib.constructor === ActorBone)
			{
				this._InfluencedBones.push(ib._Index);
			}
			else
			{
				this._InfluencedBones.push(ib);
			}
		}
	};
	
	return ActorIKTarget;
}());