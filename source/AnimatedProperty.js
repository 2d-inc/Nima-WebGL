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
	"unknown": 0,
	"posX": 1,
	"posY": 2,
	"scaleX": 3,
	"scaleY": 4,
	"rotation": 5,
	"opacity": 6,
	"drawOrder": 7,
	"length": 8,
	"vertices": 9,
	"strength": 10,
	"trigger": 11,
	"intValue": 12,
	"floatValue": 13,
	"stringValue": 14,
	"boolValue": 15,
	"isCollisionEnabled": 16,
	"sequence": 17,
	"activeChild": 18
};