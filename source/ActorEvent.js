import ActorComponent from "./ActorComponent.js";
import {vec2, mat2d} from "gl-matrix";

export default class ActorEvent extends ActorComponent
{
	constructor()
	{
		super();
	}

	getTipWorldTranslation()
	{
		var transform = mat2d.create();
		transform[4] = this._Length;
		mat2d.mul(transform, this.getWorldTransform(), transform);
		return vec2.set(vec2.create(), transform[4], transform[5]);
	}

	makeInstance(resetActor)
	{
		var node = new ActorEvent();
		node.copy(this, resetActor);
		return node;	
	}

	copy(node, resetActor)
	{
		super.copy(node, resetActor);
		this._Length = node._Length;
		this._IsConnectedToImage = node._IsConnectedToImage;
	}
}