import Animation from "./Animation.js";
import BinaryReader from "./Readers/BinaryReader.js";
import JSONReader from "./Readers/JSONReader.js";
import Actor from "./Actor.js";
import ActorEvent from "./ActorEvent.js";
import ActorNode from "./ActorNode.js";
import ActorNodeSolo from "./ActorNodeSolo.js";
import ActorBone from "./ActorBone.js";
import ActorJellyBone from "./ActorJellyBone.js";
import JellyComponent from "./JellyComponent.js";
import ActorRootBone from "./ActorRootBone.js";
import ActorImage from "./ActorImage.js";
import ActorIKTarget from "./ActorIKTarget.js";
import ActorColliderRectangle from "./ActorColliderRectangle.js";
import ActorColliderTriangle from "./ActorColliderTriangle.js";
import ActorColliderCircle from "./ActorColliderCircle.js";
import ActorColliderPolygon from "./ActorColliderPolygon.js";
import ActorColliderLine from "./ActorColliderLine.js";
import NestedActorNode from "./NestedActorNode.js";
import CustomProperty from "./CustomProperty.js";
import AnimatedComponent from "./AnimatedComponent.js";
import AnimatedProperty from "./AnimatedProperty.js";
import NestedActorAsset from "./NestedActorAsset.js";
import ActorIKConstraint from "./ActorIKConstraint.js";
import ActorDistanceConstraint from "./ActorDistanceConstraint.js";
import ActorTransformConstraint from "./ActorTransformConstraint.js";
import ActorTranslationConstraint from "./ActorTranslationConstraint.js";
import ActorScaleConstraint from "./ActorScaleConstraint.js";
import ActorRotationConstraint from "./ActorRotationConstraint.js";
import KeyFrame from "./KeyFrame.js";
import {mat2d, vec2} from "gl-matrix";


const _FirstVersion = 1065353216;
const _BlockTypes = {
	Nodes:1,
	ActorNode:2,
	ActorBone:3,
	ActorRootBone:4,
	ActorImage:5,
	View:6,
	Animation:7,
	Animations:8,
	Atlases:9,
	Atlas:10,
	ActorIKTarget:11,
	ActorEvent:12,
	CustomIntProperty:13,
	CustomFloatProperty:14,
	CustomStringProperty:15,
	CustomBooleanProperty:16,
	ColliderRectangle:17,
	ColliderTriangle:18,
	ColliderCircle:19,
	ColliderPolygon:20,
	ColliderLine:21,
	ActorImageSequence:22,
	ActorNodeSolo:23,
	NestedActorNode:24,
	NestedActorAssets:25,
	NestedActorAsset:26,
	ActorStaticMesh:27,
	JellyComponent: 28,
	ActorJellyBone: 29,
	ActorIKConstraint: 30,
	ActorDistanceConstraint: 31,
	ActorTranslationConstraint: 32,
	ActorRotationConstraint: 33,
	ActorScaleConstraint: 34,
	ActorTransformConstraint: 35
};

const _Readers = {
	"bin": {
		stream: BinaryReader,
		container: Uint8Array
	},
	"json": {
		stream: JSONReader,
		container: Object
	}
};

function _ReadNextBlock(reader, error, typesList)
{
	if(reader.isEOF())
	{
		return null;
	}
	let blockType = 0, container = 0;
	const cType = reader.containerType; // 'bin' || 'json'
	const streamReader = _Readers[cType];
	try
	{
		blockType = reader.readBlockType(typesList);
		if(blockType === undefined)
		{
			return null;
		}
		const length = reader.readUint32Length();

		container = new streamReader["container"](length);
		reader.readRaw(container, length);
	}
	catch(err)
	{
		console.log(err.constructor);
		if(error)
		{
			error(err);
		}
		return null;
	}
	return { type: blockType, reader: new streamReader.stream(container)};
}

function _ReadComponentsBlock(actor, reader)
{
	// The Binary Format is guaranteed from the exporter to be in index order.
	const numNodes = reader.readUint16Length(); // Necessary to avoid misalignment on Binary Reader.
	const actorComponents = actor._Components;
	_ReadActorNode = actor.dataVersion >= 13 ? _ReadActorNode13 : _ReadActorNode12;
	_ReadActorTargetedConstraint = actor.dataVersion >= 15 ? _ReadActorTargetedConstraint15 : _ReadActorTargetedConstraint14;

	let block = null;
	while((block=_ReadNextBlock(reader, function(err) {actor.error = err;}, _BlockTypes)) !== null)
	{
		let component = null;
		switch(block.type)
		{
			case _BlockTypes.CustomIntProperty:
			case _BlockTypes.CustomStringProperty:
			case _BlockTypes.CustomFloatProperty:
			case _BlockTypes.CustomBooleanProperty:
				component = _ReadCustomProperty(block.reader, new CustomProperty(), block.type);
				break;
			case _BlockTypes.ColliderRectangle:
				component = _ReadRectangleCollider(block.reader, new ActorColliderRectangle());
				break;
			case _BlockTypes.ColliderTriangle:
				component = _ReadTriangleCollider(block.reader, new ActorColliderTriangle());
				break;
			case _BlockTypes.ColliderCircle:
				component = _ReadCircleCollider(block.reader, new ActorColliderCircle());
				break;
			case _BlockTypes.ColliderPolygon:
				component = _ReadPolygonCollider(block.reader, new ActorColliderPolygon());
				break;
			case _BlockTypes.ColliderLine:
				component = _ReadLineCollider(block.reader, new ActorColliderLine());
				break;
			case _BlockTypes.ActorEvent:
				component = _ReadActorEvent(block.reader, new ActorEvent());
				break;
			case _BlockTypes.ActorNode:
				component = _ReadActorNode(block.reader, new ActorNode());
				break;
			case _BlockTypes.ActorBone:
				component = _ReadActorBone(block.reader, new ActorBone());
				break;
			case _BlockTypes.ActorJellyBone:
				component = _ReadActorJellyBone(block.reader, new ActorJellyBone());
				break;
			case _BlockTypes.JellyComponent:
				component = _ReadJellyComponent(block.reader, new JellyComponent());
				break;
			case _BlockTypes.ActorRootBone:
				component = _ReadActorRootBone(block.reader, new ActorRootBone());
				break;
			case _BlockTypes.ActorImage:
				component = _ReadActorImage(block.reader, new ActorImage());
				break;
			case _BlockTypes.ActorImageSequence:
				component = _ReadActorImageSequence(block.reader, new ActorImage());
				break;
			case _BlockTypes.ActorIKTarget:
				component = _ReadActorIKTarget(actor.dataVersion, block.reader, new ActorIKTarget());
				break;
			case _BlockTypes.NestedActorNode:
				component = _ReadNestedActor(block.reader, new NestedActorNode(), actor._NestedActorAssets);
				break;
			case _BlockTypes.ActorNodeSolo:
				component = _ReadActorNodeSolo(block.reader, new ActorNodeSolo());
				break;
			case _BlockTypes.ActorIKConstraint:
				component = _ReadActorIKConstraint(block.reader, new ActorIKConstraint());
				break;
			case _BlockTypes.ActorDistanceConstraint:
				component = _ReadActorDistanceConstraint(block.reader, new ActorDistanceConstraint());
				break;
			case _BlockTypes.ActorTransformConstraint:
				component = _ReadActorTransformConstraint(block.reader, new ActorTransformConstraint());
				break;
			case _BlockTypes.ActorTranslationConstraint:
				component = _ReadAxisConstraint(block.reader, new ActorTranslationConstraint());
				break;
			case _BlockTypes.ActorScaleConstraint:
				component = _ReadAxisConstraint(block.reader, new ActorScaleConstraint());
				break;
			case _BlockTypes.ActorRotationConstraint:
				component = _ReadRotationConstraint(block.reader, new ActorRotationConstraint());
				break;
		}
		if(component)
		{
			component._Idx = actorComponents.length;
		}
		actorComponents.push(component);
	}
	actor.resolveHierarchy();
}

function _ReadAnimationBlock(actor, reader)
{
	let animation = new Animation(actor);
	actor._Animations.push(animation);

	if(actor.dataVersion >= 11)
	{
		animation._Name = reader.readString("name");
		animation._FPS = reader.readUint8("fps");
		animation._Duration = reader.readFloat32("duration");
		animation._Loop = reader.readBool("isLooping");
	}

	reader.openArray("KeyedNodes");
	// Read the number of keyed nodes.
	const numKeyedComponents = reader.readUint16Length();
	if(numKeyedComponents > 0)
	{
		for(let i = 0; i < numKeyedComponents; i++)
		{
			reader.openObject("Node");
			let componentIndex = reader.readUint16("nodeIndex");
			if(actor.dataVersion >= 15)
			{
				componentIndex += 1;
			}
			let component = actor._Components[componentIndex];
			if(!component)
			{
				// Bad component was loaded, read past the animation data.
				// Note this only works after version 12 as we can read by the entire set of properties.
				// TODO: test this case with JSON.
				let props = reader.readUint16();
				for(let j = 0; j < props; j++)
				{
					let propertyBlock = _ReadNextBlock(reader, function(err) {actor.error = err;});
				}
			}
			else
			{
				const animatedComponent = new AnimatedComponent(componentIndex);
				if(component.constructor === ActorEvent)
				{
					// N.B. ActorEvents currently only keyframe their trigger so we cn optimize them into a separate array.
					animation._TriggerComponents.push(animatedComponent);
				}
				else
				{
					animation._Components.push(animatedComponent);
				}

				reader.openArray("Properties");
				const props = reader.readUint16Length();
				for(let j = 0; j < props; j++)
				{
					let propertyReader = null;
					let propertyType;

					if(actor.dataVersion >= 12)
					{
						// Since version 12 we write properties as blocks in order to allow for reading past unknown animated properties
						let propertyBlock = _ReadNextBlock(reader, function(err) {actor.error = err;}, AnimatedProperty.Properties);
						propertyReader = propertyBlock.reader;
						propertyType = propertyBlock.type;
					}
					else
					{
						propertyReader = reader;
						// propertyType = reader.readUint8();
						propertyType = reader.readBlockType(AnimatedProperty.Properties);
					}

					let validProperty = false;
					switch(propertyType)
					{
						case AnimatedProperty.Properties.PosX:
						case AnimatedProperty.Properties.PosY:
						case AnimatedProperty.Properties.ScaleX:
						case AnimatedProperty.Properties.ScaleY:
						case AnimatedProperty.Properties.Rotation:
						case AnimatedProperty.Properties.Opacity:
						case AnimatedProperty.Properties.DrawOrder:
						case AnimatedProperty.Properties.Length:
						case AnimatedProperty.Properties.VertexDeform:
						case AnimatedProperty.Properties.ConstraintStrength:
						case AnimatedProperty.Properties.Trigger:
						case AnimatedProperty.Properties.IntProperty:
						case AnimatedProperty.Properties.FloatProperty:
						case AnimatedProperty.Properties.StringProperty:
						case AnimatedProperty.Properties.BooleanProperty:
						case AnimatedProperty.Properties.IsCollisionEnabled:
						case AnimatedProperty.Properties.Sequence:
						case AnimatedProperty.Properties.ActiveChildIndex:
							validProperty = true;
							break;
						default:
							break;
					}
					if(!validProperty)
					{
						continue;
					}
					const animatedProperty = new AnimatedProperty(propertyType);
					animatedComponent._Properties.push(animatedProperty);

					propertyReader.openArray("KeyFrames");
					const keyFrameCount = propertyReader.readUint16Length();
					let lastKeyFrame = null;
					for(let k = 0; k < keyFrameCount; k++)
					{
						const keyFrame = new KeyFrame();

						propertyReader.openObject("KeyFrame");
						keyFrame._Time = propertyReader.readFloat64("time");

						// On newer version we write the interpolation first.
						if(actor.dataVersion >= 11)
						{
							switch(propertyType)
							{
								case AnimatedProperty.Properties.IsCollisionEnabled:
								case AnimatedProperty.Properties.BooleanProperty:
								case AnimatedProperty.Properties.StringProperty:
								case AnimatedProperty.Properties.Trigger:
								case AnimatedProperty.Properties.DrawOrder:
								case AnimatedProperty.Properties.ActiveChildIndex:
									// These do not interpolate.
									break;
								default:
									keyFrame._Type = propertyReader.readUint8("type");
									switch(keyFrame._Type)
									{
										case KeyFrame.Type.Asymmetric:
										case KeyFrame.Type.Mirrored:
										case KeyFrame.Type.Disconnected:
											keyFrame._InFactor = propertyReader.readFloat64("clampedInFactor");
											keyFrame._InValue = propertyReader.readFloat32("inValue");
											keyFrame._OutFactor = propertyReader.readFloat64("clampedOutFactor");
											keyFrame._OutValue = propertyReader.readFloat32("outValue");
											break;

										case KeyFrame.Type.Hold:
											keyFrame._InFactor = propertyReader.readFloat64("clampedInFactor");
											keyFrame._InValue = propertyReader.readFloat32("inValue");
											break;

										default:
											keyFrame._InValue = keyFrame._Value;
											keyFrame._OutValue = keyFrame._Value;
											break;
									}
									break;
							}
						}

						if(propertyType === AnimatedProperty.Properties.Trigger)
						{
							// No value on keyframe.
						}
						else if (propertyType === AnimatedProperty.Properties.IntProperty)
						{
							keyFrame._Value = propertyReader.readInt32("value");
						}
						else if (propertyType === AnimatedProperty.Properties.StringProperty)
						{
							keyFrame._Value = propertyReader.readString("value");
						}
						else if (propertyType === AnimatedProperty.Properties.BooleanProperty || propertyType === AnimatedProperty.Properties.IsCollisionEnabled)
						{
							keyFrame._Value = propertyReader.readBool("value");
						}
						else if (propertyType === AnimatedProperty.Properties.DrawOrder)
						{
							propertyReader.openArray("drawOrder");
							const orderedImages = propertyReader.readUint16Length();
							const orderValue = [];
							for(let l = 0; l < orderedImages; l++)
							{
								propertyReader.openObject("frame");
								const idx = propertyReader.readUint16("index");
								const order = propertyReader.readUint16("nodeId");
								orderValue.push({
									componentIdx:idx,
									value:order
								});
								propertyReader.closeObject();
							}
							propertyReader.closeArray();
							keyFrame._Value = orderValue;
						}
						else if (propertyType === AnimatedProperty.Properties.VertexDeform)
						{
							keyFrame._Value = new Float32Array(component._NumVertices * 2);
							component.hasVertexDeformAnimation = true;
							propertyReader.readFloat32Array(keyFrame._Value, "value");
						}
						else
						{
							keyFrame._Value = propertyReader.readFloat32("value");
						}
						if(actor.dataVersion === 1) // No JSON labels here.
						{
							keyFrame._Type = propertyReader.readUint8();
							switch(keyFrame._Type)
							{
								case KeyFrame.Type.Asymmetric:
								case KeyFrame.Type.Mirrored:
								case KeyFrame.Type.Disconnected:
									keyFrame._InFactor = propertyReader.readFloat64();
									keyFrame._InValue = propertyReader.readFloat32();
									keyFrame._OutFactor = propertyReader.readFloat64();
									keyFrame._OutValue = propertyReader.readFloat32();
									break;

								case KeyFrame.Type.Hold:
									keyFrame._InFactor = propertyReader.readFloat64();
									keyFrame._InValue = propertyReader.readFloat32();
									break;

								default:
									keyFrame._InValue = keyFrame._Value;
									keyFrame._OutValue = keyFrame._Value;
									break;
							}
						}
						else
						{
							switch(keyFrame._Type)
							{
								case KeyFrame.Type.Asymmetric:
								case KeyFrame.Type.Mirrored:
								case KeyFrame.Type.Disconnected:
								case KeyFrame.Type.Hold:
									break;

								default:
									keyFrame._InValue = keyFrame._Value;
									keyFrame._OutValue = keyFrame._Value;
									break;
							}
						}
						if (propertyType === AnimatedProperty.Properties.DrawOrder)
						{
							// Always hold draw order.
							keyFrame._Type = KeyFrame.Type.Hold;
						}
						else if (propertyType === AnimatedProperty.Properties.VertexDeform)
						{
							keyFrame._Type = KeyFrame.Type.Linear;
						}

						if(lastKeyFrame)
						{
							lastKeyFrame.setNext(keyFrame);
						}
						animatedProperty._KeyFrames.push(keyFrame);
						lastKeyFrame = keyFrame;
						propertyReader.closeObject(); // KeyFrame.
					}
					propertyReader.closeArray();
					if(lastKeyFrame)
					{
						lastKeyFrame.setNext(null);
					}
				}
				reader.closeArray();
			}
			reader.closeObject();
		}

		reader.closeArray();

		if(actor.dataVersion == 1)
		{
			animation._FPS  = reader.readUint8();
		}
		animation._DisplayStart = reader.readFloat32("animationStart");
		animation._DisplayEnd = reader.readFloat32("animationEnd");
		//animation._DisplayStart = 0;
		//animation._DisplayEnd = 50/60;
	}
}

function _ReadAnimationsBlock(actor, reader)
{
	const animationsCount = reader.readUint16Length(); // Align the block reader when Binary.
	let block = null;
	// The animations block only contains a list of animations, so we don't need to track how many we've read in.
	while((block=_ReadNextBlock(reader, function(err) {actor.error = err;}, _BlockTypes)) !== null)
	{
		switch(block.type)
		{
			case _BlockTypes.Animation:
				_ReadAnimationBlock(actor, block.reader);
				break;
		}
	}
}

function _ReadNestedActorAssetBlock(actor, reader)
{
	let asset = new NestedActorAsset(reader.readString(), reader.readString());
	actor._NestedActorAssets.push(asset);
}

function _ReadNestedActorAssets(actor, reader)
{
	const nestedActorCount = reader.readUint16();
	let block = null;
	while((block=_ReadNextBlock(reader, function(err) {actor.error = err;}, _BlockTypes)) !== null)
	{
		switch(block.type)
		{
			case _BlockTypes.NestedActorAsset:
				_ReadNestedActorAssetBlock(actor, block.reader);
				break;
		}
	}
}

function _BuildJpegAtlas(atlas, img, imga, callback)
{
	const canvas = document.createElement("canvas");
	canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, img.width, img.height);
	
	if(imga)
	{
		const imageDataRGB = ctx.getImageData(0,0,canvas.width, canvas.height);
		const dataRGB = imageDataRGB.data;
		const canvasAlpha = document.createElement("canvas");
		canvasAlpha.width = img.width;
		canvasAlpha.height = img.height;
		const actx = canvasAlpha.getContext("2d");
		actx.drawImage(imga, 0, 0, imga.width, imga.height);

		const imageDataAlpha = actx.getImageData(0,0,canvasAlpha.width, canvasAlpha.height);
		const dataAlpha = imageDataAlpha.data;

		const pixels = dataAlpha.length/4;
		let widx = 3;

		for(let j = 0; j < pixels; j++)
		{
			dataRGB[widx] = dataAlpha[widx-1];
			widx+=4;
		}
		ctx.putImageData(imageDataRGB, 0, 0);
	}

	const atlasImage = new Image();
	const enc = canvas.toDataURL();
	atlasImage.src = enc;
	atlasImage.onload = function()
	{
		atlas.img = this;
		callback();
	};
}

function _JpegAtlas(dataRGB, dataAlpha, callback)
{
	const _This = this;
	const img = document.createElement("img");
	let imga;
	let c = 0;
	let target = 1;
	img.onload = function()
	{
		c++;
		if(c===target)
		{
			_BuildJpegAtlas(_This, img, imga, callback);
		}
	};

	if(dataAlpha)
	{
		target = 2;
		imga = document.createElement("img");
		imga.onload = function()
		{
			c++;
			if(c===target)
			{
				_BuildJpegAtlas(_This, img, imga, callback);
			}
		};
		imga.src = URL.createObjectURL(dataAlpha);
	}
	img.src = URL.createObjectURL(dataRGB);
}

function _ReadAtlasesBlock(actor, reader, callback)
{
	// Read atlases.
	const numAtlases = reader.readUint16Length();

	let waitCount = 0;
	let loadedCount = 0;
	function loaded()
	{
		loadedCount++;
		if(loadedCount === waitCount)
		{
			callback();
		}
	}

	const readerType = reader.containerType;
	for(let i = 0; i < numAtlases; i++)
	{
		if(readerType === "json")
		{
			const b64img = reader.readString();
			waitCount++;
			// Build PNG Atlas
			const img = document.createElement("img");
			const atlas = {};
			img.onload = function()
			{
				atlas.img = this;
				loaded();
			};
			actor._Atlases.push(atlas);
			img.src = b64img;
		}
		else if (readerType === "bin")
		{
			let size = reader.readUint32();
			const atlasDataRGB = new Uint8Array(size);
			reader.readRaw(atlasDataRGB, atlasDataRGB.length);
			const rgbSrc = new Blob([atlasDataRGB], {type: "image/jpeg"});
			
			let alphaSrc;
			if(actor.dataVersion <= 14)
			{
				size = reader.readUint32();
				const atlasDataAlpha = new Uint8Array(size);
				reader.readRaw(atlasDataAlpha, atlasDataAlpha.length);
				alphaSrc = new Blob([atlasDataAlpha], {type: "image/jpeg"});		
			}

			waitCount++;
			const atlas = new _JpegAtlas(rgbSrc, alphaSrc, loaded);
			actor._Atlases.push(atlas);
		}
	}

	// Return true if we are waiting for atlases
	return waitCount !== loadedCount;
}

function _LoadNestedAssets(loader, actor, callback)
{
	let loadCount = actor._NestedActorAssets.length;
	let nestedLoad = loader.loadNestedActor;
	if(loadCount == 0 || !nestedLoad)
	{
		callback(actor);
		return;
	}

	for(let asset of actor._NestedActorAssets)
	{
		nestedLoad(asset, function(nestedActor)
		{
			asset._Actor = nestedActor;
			loadCount--;
			if(loadCount <= 0)
			{
				callback(actor);
			}
		});
	}
}

function _ReadShot(loader, data, callback)
{
	let reader = new BinaryReader(new Uint8Array(data));

	const N = reader.readUint8();
	const I = reader.readUint8();
	const M = reader.readUint8();
	const A = reader.readUint8();

	if(N !== 78 || I !== 73 || M !== 77 || A !== 65)
	{
		console.info("Not a binary file!");
		const dataView = new DataView(data);
		const stringData = new TextDecoder("utf-8").decode(dataView);
		reader = new JSONReader({"container": JSON.parse(stringData)});
	}

	const version = reader.readUint32("version");
	const actor = new Actor();
	actor.dataVersion = version === _FirstVersion ? 1 : version;
	let block = null;
	let waitForAtlas = false;
	while((block=_ReadNextBlock(reader, function(err) {actor.error = err;}, _BlockTypes)) !== null)
	{
		switch(block.type)
		{
			case _BlockTypes.Nodes:
				_ReadComponentsBlock(actor, block.reader);
				break;
			case _BlockTypes.View:
				actor._ViewCenter = vec2.create();
				// block.reader.readFloat32Array(actor._ViewCenter);
				actor._ViewCenter[0] = block.reader.readFloat32("x");
				actor._ViewCenter[1] = block.reader.readFloat32("y");
				actor._ViewWidth = block.reader.readFloat32("width");
				actor._ViewHeight = block.reader.readFloat32("height");
				break;
			case _BlockTypes.Animations:
				_ReadAnimationsBlock(actor, block.reader);
				break;
			case _BlockTypes.Atlases:

				if(_ReadAtlasesBlock(actor, block.reader, function()
					{
						_LoadNestedAssets(loader, actor, callback);
					}))
				{
					waitForAtlas = true;
				}
				break;
			case _BlockTypes.NestedActorAssets:
				_ReadNestedActorAssets(actor, block.reader);
				break;
		}
	}
	if(!waitForAtlas)
	{
		_LoadNestedAssets(loader, actor, callback);
	}
}

function _ReadActorComponent(reader, component)
{
	component._Name = reader.readString("name");
	component._ParentIdx = reader.readId("parentId");
	return component;
}

function _ReadCustomProperty(reader, component, type)
{
	_ReadActorComponent(reader, component);

	switch(type)
	{
		case _BlockTypes.CustomIntProperty:
			component._PropertyType = CustomProperty.Type.Integer;
			component._Value = reader.readInt32("int");
			break;
		case _BlockTypes.CustomFloatProperty:
			component._PropertyType = CustomProperty.Type.Float;
			component._Value = reader.readFloat32("float");
			break;
		case _BlockTypes.CustomStringProperty:
			component._PropertyType = CustomProperty.Type.String;
			component._Value = reader.readString("string");
			break;
		case _BlockTypes.CustomBooleanProperty:
			component._PropertyType = CustomProperty.Type.Boolean;
			component._Value = reader.readBool("bool");
			break;
	}

	return component;
}

function _ReadCollider(reader, component)
{
	_ReadActorNode(reader, component);
	component._IsCollisionEnabled = reader.readBool("isCollisionEnabled");
	return component;
}

function _ReadRectangleCollider(reader, component)
{
	_ReadCollider(reader, component);

	component._Width = reader.readFloat32("width");
	component._Height = reader.readFloat32("height");

	return component;
}

function _ReadTriangleCollider(reader, component)
{
	_ReadCollider(reader, component);

	component._Width = reader.readFloat32("width");
	component._Height = reader.readFloat32("height");

	return component;
}

function _ReadCircleCollider(reader, component)
{
	_ReadCollider(reader, component);

	component._Radius = reader.readFloat32("radius");

	return component;
}

function _ReadPolygonCollider(reader, component)
{
	_ReadCollider(reader, component);

	let numVertices = reader.readUint32("cc");
	component._ContourVertices = new Float32Array(numVertices * 2);
	reader.readFloat32Array(component._ContourVertices, "contour");

	return component;
}

function _ReadLineCollider(reader, component)
{
	_ReadCollider(reader, component);

	let numVertices = reader.readUint32("lineDataLength");
	component._Vertices = new Float32Array(numVertices * 2);
	reader.readFloat32Array(component._Vertices, "lineData");

	return component;
}

function _ReadActorEvent(reader, component)
{
	_ReadActorComponent(reader, component);
	return component;
}

let _ReadActorNode = null;

function _ReadActorNode13(reader, component)
{
	_ReadActorNode12(reader, component);
	component._IsCollapsedVisibility = reader.readBool("isCollapsedVisibility");

	return component;
}

function _ReadActorNode12(reader, component)
{
	_ReadActorComponent(reader, component);

	reader.readFloat32Array(component._Translation, "translation");
	component._Rotation = reader.readFloat32("rotation");
	reader.readFloat32Array(component._Scale, "scale");
	component._Opacity = reader.readFloat32("opacity");

	return component;
}

function _ReadActorNodeSolo(reader, component)
{
	_ReadActorNode(reader, component);
	component._ActiveChildIndex = reader.readUint32("activeChild");
	return component;
}

function _ReadActorBone(reader, component)
{
	_ReadActorNode(reader, component);
	component._Length = reader.readFloat32("length");
	return component;
}

function _ReadActorJellyBone(reader, component)
{
	_ReadActorComponent(reader, component);
	component._Opacity = reader.readFloat32("opacity");
	component._IsCollapsedVisibility = reader.readBool("isCollapsedVisibility");

	return component;
}

function _ReadJellyComponent(reader, component)
{
	_ReadActorComponent(reader, component);
	component._EaseIn = reader.readFloat32("easeIn");
	component._EaseOut = reader.readFloat32("easeOut");
	component._ScaleIn = reader.readFloat32("scaleIn");
	component._ScaleOut = reader.readFloat32("scaleOut");
	component._InTargetIdx = reader.readUint16("inTargetId");
	component._OutTargetIdx = reader.readUint16("outTargetId");

	return component;
}

function _ReadActorRootBone(reader, component)
{
	_ReadActorNode(reader, component);

	return component;
}

// N.B. no support for JSON labels here, as they've been introduced in version #15.
function _ReadActorIKTarget(version, reader, component)
{
	_ReadActorNode(reader, component);

	// We no longer read order in versions above 14 as order is implicit.
	if(version < 14)
	{
		component._Order = reader.readUint16();
	}
	component._Strength = reader.readFloat32();
	component._InvertDirection = reader.readBool();

	let numInfluencedBones = reader.readUint8();
	if(numInfluencedBones > 0)
	{
		component._InfluencedBones = [];

		for(let i = 0; i < numInfluencedBones; i++)
		{
			component._InfluencedBones.push(reader.readUint16());
		}
	}

	return component;
}

function _ReadActorConstraint(reader, component)
{
	_ReadActorComponent(reader, component);
	component._Strength = reader.readFloat32("strength");
	component._IsEnabled = reader.readBool("isEnabled");
}

let _ReadActorTargetedConstraint = null;

// From version 15 on indices are different.
function _ReadActorTargetedConstraint15(reader, component)
{
	_ReadActorConstraint(reader, component);
	// const tid = reader.readUint16("targetId");
	component._TargetIdx = reader.readId("targetId");
}

function _ReadActorTargetedConstraint14(reader, component)
{
	_ReadActorConstraint(reader, component);

	component._TargetIdx = reader.readUint16("targetId");
}

function _ReadActorIKConstraint(reader, component)
{
	_ReadActorTargetedConstraint(reader, component);

	component._InvertDirection = reader.readBool("isInverted");

	reader.openArray("InfluencedBones");
	const numInfluencedBones = reader.readUint8Length();
	if(numInfluencedBones > 0)
	{
		component._InfluencedBones = [];

		for(let i = 0; i < numInfluencedBones; i++)
		{
			const val = reader.readUint16() + 1; // No need for label here either since we're clearing elements from an array.
			component._InfluencedBones.push(val);
		}
	}
	reader.closeArray();
	return component;
}

function _ReadActorDistanceConstraint(reader, component)
{
	_ReadActorTargetedConstraint(reader, component);

	component._Distance = reader.readFloat32("distance");
	component._Mode = reader.readUint8("modeId");

	return component;
}

function _ReadActorTransformConstraint(reader, component)
{
	_ReadActorTargetedConstraint(reader, component);

	component._SourceSpace = reader.readUint8("sourceSpaceId");
	component._DestSpace = reader.readUint8("destSpaceId");

	return component;
}

function _ReadRotationConstraint(reader, component)
{
	_ReadActorTargetedConstraint(reader, component);

	if((component._Copy = reader.readBool("copy")))
	{
		component._Scale = reader.readFloat32("scale");
	}
	if((component._EnableMin = reader.readBool("enableMin")))
	{
		component._Min = reader.readFloat32("min");
	}
	if((component._EnableMax = reader.readBool("enableMax")))
	{
		component._Max = reader.readFloat32("max");
	}

	component._Offset = reader.readBool("offset");
	component._SourceSpace = reader.readUint8("sourceSpaceId");
	component._DestSpace = reader.readUint8("destSpaceId");
	component._MinMaxSpace = reader.readUint8("minMaxSpaceId");

	return component;
}

function _ReadAxisConstraint(reader, component)
{
	_ReadActorTargetedConstraint(reader, component);
	// X Axis
	if((component._CopyX = reader.readBool("copyX")))
	{
		component._ScaleX = reader.readFloat32("scaleX");
	}
	if((component._EnableMinX = reader.readBool("enableMinX")))
	{
		component._MinX = reader.readFloat32("minX");
	}
	if((component._EnableMaxX = reader.readBool("enableMaxX")))
	{
		component._MaxX = reader.readFloat32("maxX");
	}

	// Y Axis
	if((component._CopyY = reader.readBool("copyY")))
	{
		component._ScaleY = reader.readFloat32("scaleY");
	}
	if((component._EnableMinY = reader.readBool("enableMinY")))
	{
		component._MinY = reader.readFloat32("minY");
	}
	if((component._EnableMaxY = reader.readBool("enableMaxY")))
	{
		component._MaxY = reader.readFloat32("maxY");
	}

	component._Offset = reader.readBool("offset");
	component._SourceSpace = reader.readUint8("sourceSpaceId");
	component._DestSpace = reader.readUint8("destSpaceId");
	component._MinMaxSpace = reader.readUint8("minMaxSpaceId");

	return component;
}

function _ReadActorImage(reader, component)
{
	_ReadActorNode(reader, component);
	const isVisible = reader.readBool("isVisible");
	if(isVisible)
	{
		component._BlendMode = reader.readUint8("blendMode");
		component._DrawOrder = reader.readUint16("drawOrder");
		component._AtlasIndex = reader.readUint8("atlas");

		reader.openArray("ConnectedBones");
		const numConnectedBones = reader.readUint8Length();
		if(numConnectedBones > 0)
		{
			component._ConnectedBones = [];
			for(let i = 0; i < numConnectedBones; i++)
			{
				reader.openObject("bone");
				
				const bind = mat2d.create();
				const componentIndex = reader.readUint16("id") + 1;
				reader.readFloat32Array(bind, "bind");
				
				reader.closeObject();

				component._ConnectedBones.push({
					componentIndex:componentIndex,
					bind:bind,
					ibind:mat2d.invert(mat2d.create(), bind)
				});
			}
			reader.closeArray();
			
			// Read the final override parent world.
			// In JSON this is in the parent object so the array needs to be closed before.
			const overrideWorld = mat2d.create();
			reader.readFloat32Array(overrideWorld, "worldTransform");
			mat2d.copy(component._WorldTransform, overrideWorld);
			component._OverrideWorldTransform = true;
		}
		else
		{
			// Close the JSON Array opened above.
			reader.closeArray();
		}

		const numVertices = reader.readUint32("numVertices");
		const vertexStride = numConnectedBones > 0 ? 12 : 4;

		component._NumVertices = numVertices;
		component._VertexStride = vertexStride;
		component._Vertices = new Float32Array(numVertices * vertexStride);
		reader.readFloat32Array(component._Vertices, "vertices");

		const numTris = reader.readUint32("numTriangles");
		component._Triangles = new Uint16Array(numTris * 3);
		reader.readUint16Array(component._Triangles, "triangles");
	}

	return component;
}

function _ReadActorImageSequence(reader, component)
{
	_ReadActorImage(reader, component);

	// See if it was visible to begin with.
	if(component._AtlasIndex != -1)
	{
		reader.openArray("FrameAssets");
		const frameAssetCount = reader.readUint16Length();
		component._SequenceFrames = [];
		const uvs = new Float32Array(component._NumVertices*2*frameAssetCount);
		const uvStride = component._NumVertices*2;
		component._SequenceUVs = uvs;
		const firstFrame = {
			atlas:component._AtlasIndex,
			offset:0
		};

		component._SequenceFrames.push(firstFrame);

		let readIdx = 2;
		let writeIdx = 0;
		for(let i = 0; i < component._NumVertices; i++)
		{
			uvs[writeIdx++] = component._Vertices[readIdx];
			uvs[writeIdx++] = component._Vertices[readIdx+1];
			readIdx += component._VertexStride;
		}

		let offset = uvStride;
		for(let i = 1; i < frameAssetCount; i++)
		{

			reader.openObject("frameAsset");
			const frame = {
				atlas:reader.readUint8("atlasId"),
				offset:offset*4
			};

			component._SequenceFrames.push(frame);
			reader.readFloat32ArrayOffset(uvs, uvStride, offset, "frameUV");

			offset += uvStride;
			reader.closeObject();
		}
	}

	reader.closeArray();

	return component;
}

function _ReadNestedActor(reader, component, nestedActorAssets)
{
	_ReadActorNode(reader, component);
	let isVisible = reader.readUint8();
	if(isVisible)
	{
		// Draw order
		component._DrawOrder = reader.readUint16();
		let assetIndex = reader.readUint16();
		if(assetIndex < nestedActorAssets.length)
		{
			component._Asset = nestedActorAssets[assetIndex];
		}
	}
	return component;
}

export default class ActorLoader
{
	load(url, callback)
	{
		let loader = this;
		if(url.constructor === String)
		{
			let req = new XMLHttpRequest();
			req.open("GET", url, true);
			req.responseType = "blob";
			req.onload = function()
			{
				let fileReader = new FileReader();
				fileReader.onload = function()
				{
					_ReadShot(loader, this.result, callback);
				};
				fileReader.readAsArrayBuffer(this.response);
			};
			req.send();
		}
		else
		{
			let fileReader = new FileReader();
			fileReader.onload = function()
			{
				_ReadShot(loader, this.result, callback);
			};
			fileReader.readAsArrayBuffer(url);
		}
	}

	loadFromData(data, callback)
	{
		_ReadShot(this, data, callback);
	}
}