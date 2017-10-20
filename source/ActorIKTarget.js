import ActorNode from "./ActorNode.js";
import ActorBone from "./ActorBone.js";
import {vec2, mat2d} from "gl-matrix";

function _Solve2(b1, b2, worldTargetTranslation, invert)
{
	let world = b1._Parent.getWorldTransform();
	let b1c = b2;
	while(b1c && b1c._Parent != b1)
	{
		b1c = b1c._Parent;
	}
	// Transform to root bone space
	if(b1._Parent._Length)
	{
		let t = mat2d.fromTranslation(mat2d.create(), [b1._Parent._Length, 0]);
		world = mat2d.mul(t, world, t);
	}

	let iworld = mat2d.invert(mat2d.create(), world);
	if(!iworld)
	{
		return false;
	}

	let pA = b1.getWorldTranslation();
	let pC = b1.getTipWorldTranslation();
	let pB = b2.getTipWorldTranslation();
	let pBT = vec2.copy(vec2.create(), worldTargetTranslation);

	pA = vec2.transformMat2d(pA, pA, iworld);
	pC = vec2.transformMat2d(pC, pC, iworld);
	pB = vec2.transformMat2d(pB, pB, iworld);
	pBT = vec2.transformMat2d(pBT, pBT, iworld);

	// http://mathworld.wolfram.com/LawofCosines.html
	let av = vec2.subtract(vec2.create(), pB, pC);
	let a = vec2.length(av);

	let bv = vec2.subtract(vec2.create(), pC, pA);
	let b = vec2.length(bv);

	let cv = vec2.subtract(vec2.create(), pBT, pA);
	let c = vec2.length(cv);

	let A = Math.acos(Math.max(-1,Math.min(1,(-a*a+b*b+c*c)/(2*b*c))));
	let C = Math.acos(Math.max(-1, Math.min(1,(a*a+b*b-c*c)/(2*a*b))));

	let angleCorrection = 0;
	if(b1c != b2)
	{
		let world2 = b1c.getWorldTransform();
		let iworld2 = mat2d.invert(mat2d.create(), world2);
		if(!iworld2)
		{
			return false;
		}

		let pa2 = b2.getTipWorldTranslation();
		let tipBone2Local = vec2.transformMat2d(pa2, pa2, iworld2);
		let a = Math.atan2(tipBone2Local[1], tipBone2Local[0]);

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

	return true;
}

function _Solve1(b1, worldTargetTranslation)
{
	var world2 = b1.getWorldTransform();
	var iworld2 = mat2d.invert(mat2d.create(), world2);

	var targetLocal = vec2.transformMat2d(vec2.create(), worldTargetTranslation, iworld2);
	var a = Math.atan2(targetLocal[1], targetLocal[0]);

	b1.overrideRotation(b1._OverrideRotation+a);
}

export default class ActorIKTarget extends ActorNode
{
	constructor()
	{
		super();

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

	resolveComponentIndices(components)
	{
		super.resolveComponentIndices(components);

		let bones = this._InfluencedBones;
		if(!bones || !bones.length)
		{
			return;
		}

		for(let j = 0; j < bones.length; j++)
		{
			let componentIndex = bones[j];
			if(componentIndex.constructor !== Number)
			{
				componentIndex = componentIndex._Index;
			}

			{
				bones[j] = components[componentIndex];
				bones[j]._Dependents.push(this);
			}
		}

		this._Bone1 = bones[0];
		this._Bone2 = bones[bones.length-1];
		let b1c = this._Bone2;
		let b1 = this._Bone1;
		if(bones.length > 1)
		{
			while(b1c && b1c._Parent != b1)
			{
				b1c = b1c._Parent;
			}
		}

		this._Bone1Child = b1c;

		let end = this._Bone2;
		this._Chain = [];
		while(end && end != b1._Parent)
		{
			// if the bone or the parent of the bone is in, then we will manipulate the rotation, so it's in.
			this._Chain.push({bone:end, angle:0, in:bones.indexOf(end) != -1 || bones.indexOf(end._Parent) != -1});
			end = end._Parent;
		}
	}

	initialize()
	{
		let bones = this._InfluencedBones;
		if(!bones.length)
		{
			return;
		}
		this._Bone1 = bones[0];
		this._Bone2 = bones[bones.length-1];
		let b1c = this._Bone2;
		let b1 = this._Bone1;
		if(bones.length > 1)
		{
			while(b1c && b1c._Parent != b1)
			{
				b1c = b1c._Parent;
			}
		}

		this._Bone1Child = b1c;

		let end = this._Bone2;
		this._Chain = [];
		while(end && end != b1._Parent)
		{
			// if the bone or the parent of the bone is in, then we will manipulate the rotation, so it's in.
			this._Chain.push({bone:end, angle:0, in:bones.indexOf(end) != -1 || bones.indexOf(end._Parent) != -1});
			end = end._Parent;
		}
	}

	needsSolve()
	{
		if(this._IsWorldDirty || this._IsDirty)
		{
			return true;
		}
		return false;
	}

	solveStart()
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
	}

	solve()
	{
		let worldTargetTranslation = vec2.create();
		let wt = this.getWorldTransform();
		worldTargetTranslation[0] = wt[4];
		worldTargetTranslation[1] = wt[5];

		let strength = this._Strength;
		let bones = this._InfluencedBones;
		let chain = this._Chain;
		let tip = this._Bone2;
		let invert = this._InvertDirection;

		for(let i = 0; i < chain.length; i++)
		{
			let fk = chain[i];
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
			for(let i = 0; i < bones.length-1; i++)
			{
				_Solve2(bones[i], tip, worldTargetTranslation);
			}
		}

		// At the end, mix the FK angle with the IK angle by strength
		let m = strength;
		if(m != 1.0)
		{
			let im = 1.0-strength;
			for(let i = 0; i < chain.length; i++)
			{
				let fk = chain[i];
				if(fk.in)
				{
					fk.bone.overrideRotation(fk.bone._OverrideRotation * m + fk.angle * im);
				}
			}
		}
	}

	makeInstance(resetActor)
	{
		let node = new ActorIKTarget();
		node.copy(this, resetActor);
		return node;	
	}

	copy(node, resetActor)
	{
		super.copy(node, resetActor);

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
	}
}