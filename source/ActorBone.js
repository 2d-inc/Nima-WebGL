import ActorNode from "./ActorNode.js";
import {vec2, mat2d} from "gl-matrix";

export default class ActorBone extends ActorNode
{
	constructor()
	{
		super();

		this._Length = 0;
		this._IsConnectedToImage = false;
		this._JellyBones = null;
	}

	getTipWorldTranslation()
	{
		var transform = mat2d.create();
		transform[4] = this._Length;
		mat2d.mul(transform, this._WorldTransform, transform);
		return vec2.set(vec2.create(), transform[4], transform[5]);
	}

	makeInstance(resetActor)
	{
		var node = new ActorBone();
		node.copy(this, resetActor);
		return node;	
	}

	copy(node, resetActor)
	{
		super.copy(node, resetActor);
		this._Length = node._Length;
		this._IsConnectedToImage = node._IsConnectedToImage;
		if(node._JellyBones)
		{
			this._JellyBones = [];
			this._EaseIn = node._EaseIn;
			this._EaseOut = node._EaseOut;
			this._ScaleIn = node._ScaleIn;
			this._ScaleOut = node._ScaleOut;
			this._InTargetIdx = node._InTargetIdx;
			this._OutTargetIdx = node._OutTargetIdx;
		}
	}

	resolveComponentIndices(components)
	{
		super.resolveComponentIndices(components);
		if(this._InTargetIdx !== undefined)
		{
			this._InTarget = components[this._InTargetIdx];
		}
		if(this._OutTargetIdx !== undefined)
		{
			this._OutTarget = components[this._OutTargetIdx];
		}
	}
}