import ActorNode from "./ActorNode.js";

export default class ActorNodeSolo extends ActorNode
{
	constructor()
	{
		super();
		this._ActiveChildIndex = 0;
	}

	setActiveChildIndex(idx)
	{
		if(this._ActiveChildIndex !== idx)
		{
			this._ActiveChildIndex = idx;

			for(var i = 0; i < this._Children.length; ++i)
			{
				var an = this._Children[i];
				var cv = i !== (this._ActiveChildIndex - 1);
				an.setCollapsedVisibility(cv);
			}
		}
	}

	makeInstance(resetActor)
	{
		let node = new ActorNodeSolo();
		ActorNode.prototype.copy.call(node, this, resetActor);
		return node;
	}

	copy(node, resetActor)
	{
		super.copy(node, resetActor);
		this._ActiveChildIndex = node._ActiveChildIndex;
	}
}