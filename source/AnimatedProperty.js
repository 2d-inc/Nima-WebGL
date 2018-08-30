export default class AnimatedProperty
{
	constructor(type)
	{
		this._Type = type;
		this._KeyFrames = [];
	}
}

AnimatedProperty.Properties = 
{
	unknown:0,
	framePosX:1,
	framePosY:2,
	frameScaleX:3,
	frameScaleY:4,
	frameRotation:5,
	frameOpacity:6,
	frameDrawOrder:7,
	frameLength:8,
	frameVertices:9,
	frameStrength:10,
	frameTrigger:11,
	frameIntValue:12,
	frameFloatValue:13,
	frameStringValue:14,
	frameBooleanValue:15,
	frameIsCollisionEnabled:16,
	frameSequence:17,
	frameActiveChild: 18
};