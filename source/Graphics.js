import {mat4} from "gl-matrix";

export default class Graphics
{
	constructor(glOrCanvas)
	{
		let contextOptions = {
			premultipliedAlpha: false,
			preserveDrawingBuffer: true
		};


		let _GL = glOrCanvas instanceof WebGLRenderingContext ? glOrCanvas : glOrCanvas.getContext("webgl", contextOptions) || glOrCanvas.getContext("experimental-webgl", contextOptions);
		let canvas = glOrCanvas instanceof WebGLRenderingContext ? null : glOrCanvas;

		let _AnisotropyExtension = _GL.getExtension("EXT_texture_filter_anisotropic");
		let _MaxAnisotropy;
		if(_AnisotropyExtension)
		{
			_MaxAnisotropy = _GL.getParameter(_AnisotropyExtension.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
		}

		let _Projection = mat4.create();
		let _Transform = mat4.create();
		let _ViewTransform = mat4.create();
		let _ColorBuffer = new Float32Array(4);
		let _ViewportWidth = 0;
		let _ViewportHeight = 0;
		let _BlendMode = null;

		function _SetSize(width, height)
		{
			// Check if the canvas is not the same size.
			if (_ViewportWidth != width || _ViewportHeight != height)
			{
				// Make the canvas the same size
				if(canvas)
				{
					canvas.width = width;
					canvas.height = height;
				}

				_ViewportWidth = width;
				_ViewportHeight = height;
				mat4.ortho(_Projection, 0, _ViewportWidth, 0, _ViewportHeight, 0, 1);
				_GL.viewport(0, 0, _ViewportWidth, _ViewportHeight);
				return true;
			}
			return false;
		}

		function _Clear()
		{
			//_GL.clearColor(0.0, 0.0, 0.0, 0.0);
			_GL.clearColor(0.3628, 0.3628, 0.3628, 1.0);
			_GL.clear(_GL.COLOR_BUFFER_BIT);
		}

		function _DeleteTexture(tex)
		{
			_GL.deleteTexture(tex);
		}

		function _LoadTexture(blob)
		{
			let tex = _GL.createTexture();
			tex.ready = false;

			_GL.bindTexture(_GL.TEXTURE_2D, tex);
			_GL.texImage2D(_GL.TEXTURE_2D, 0, _GL.RGBA, 1, 1, 0, _GL.RGBA, _GL.UNSIGNED_BYTE, null);
			_GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MAG_FILTER, _GL.LINEAR);
			_GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MIN_FILTER, _GL.LINEAR);
			_GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_S, _GL.CLAMP_TO_EDGE);
			_GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_T, _GL.CLAMP_TO_EDGE);
			_GL.bindTexture(_GL.TEXTURE_2D, null);
			_GL.pixelStorei(_GL.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
			_GL.pixelStorei(_GL.UNPACK_FLIP_Y_WEBGL, false);
			if(blob.constructor !== Blob)
			{
				_GL.bindTexture(_GL.TEXTURE_2D, tex);
				_GL.texImage2D(_GL.TEXTURE_2D, 0, _GL.RGBA, _GL.RGBA, _GL.UNSIGNED_BYTE, blob.img);
				_GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MAG_FILTER, _GL.LINEAR);
				_GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MIN_FILTER, _GL.LINEAR_MIPMAP_LINEAR);
				_GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_S, _GL.CLAMP_TO_EDGE);
				_GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_T, _GL.CLAMP_TO_EDGE);
				if(_AnisotropyExtension)
				{
					_GL.texParameterf(_GL.TEXTURE_2D, _AnisotropyExtension.TEXTURE_MAX_ANISOTROPY_EXT, _MaxAnisotropy);
				}
				_GL.generateMipmap(_GL.TEXTURE_2D);
				_GL.bindTexture(_GL.TEXTURE_2D, null);

				tex.ready = true;
			}
			else
			{
				let reader = new FileReader();
				reader.onload = function(e)
				{
					let img = new Image();
					img.src = e.target.result;
					img.onload = function()
					{
						_GL.bindTexture(_GL.TEXTURE_2D, tex);
						_GL.texImage2D(_GL.TEXTURE_2D, 0, _GL.RGBA, _GL.RGBA, _GL.UNSIGNED_BYTE, this);
						_GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MAG_FILTER, _GL.LINEAR);
						_GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MIN_FILTER, _GL.LINEAR_MIPMAP_LINEAR);
						_GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_S, _GL.CLAMP_TO_EDGE);
						_GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_T, _GL.CLAMP_TO_EDGE);
						if(_AnisotropyExtension)
						{
							_GL.texParameterf(_GL.TEXTURE_2D, _AnisotropyExtension.TEXTURE_MAX_ANISOTROPY_EXT, _MaxAnisotropy);
						}
						_GL.generateMipmap(_GL.TEXTURE_2D);
						_GL.bindTexture(_GL.TEXTURE_2D, null);

						tex.ready = true;
					};
				};
				reader.readAsDataURL(blob);
			}

			return tex;
		}

		function _Bind(shader, buffer, buffer2)
		{
			let boundBuffer = _GL.getParameter(_GL.ARRAY_BUFFER_BINDING);
			let boundShader = _GL.getParameter(_GL.CURRENT_PROGRAM);

			// May need to revisit this based on buffer2
			if (boundShader === shader && boundBuffer === buffer)
			{
				return false;
			}

			// Disable anything necessary for the old shader.
			if (boundShader)
			{
				let attribCount = _GL.getProgramParameter(boundShader, _GL.ACTIVE_ATTRIBUTES);
				for (let i = 1; i < attribCount; i++)
				{
					_GL.disableVertexAttribArray(i);
				}
			}

			if (shader == null)
			{
				_GL.useProgram(null);
				return;
			}

			// Bind the new one.
			_GL.useProgram(shader.program);

			// Assume the user knows what they are doing, binding a secondary set of attribs from another buffer.
			if (buffer2)
			{
				_GL.bindBuffer(_GL.ARRAY_BUFFER, buffer2);

				let atts = shader.attributes2;
				for (let a in atts)
				{
					let at = atts[a];

					if (at.index != -1)
					{
						_GL.enableVertexAttribArray(at.index);
						_GL.vertexAttribPointer(at.index, at.size, _GL.FLOAT, false, at.stride, at.offset);
					}
				}
			}

			_GL.bindBuffer(_GL.ARRAY_BUFFER, buffer);

			let atts = shader.attributes;
			for (let a in atts)
			{
				let at = atts[a];

				if (at.index != -1)
				{
					_GL.enableVertexAttribArray(at.index);
					_GL.vertexAttribPointer(at.index, at.size, _GL.FLOAT, false, at.stride, at.offset);
				}
			}

			return true;
		}

		function _DisableBlending()
		{
			if (_BlendMode === 0)
			{
				return;
			}
			_BlendMode = 0;
			_GL.disable(_GL.BLEND);
		}

		function _EnableBlending()
		{
			if (_BlendMode === 1)
			{
				return;
			}
			_BlendMode = 1;
			_GL.enable(_GL.BLEND);
			//_GL.blendFuncSeparate(_GL.SRC_ALPHA, _GL.ONE_MINUS_SRC_ALPHA, _GL.ONE, _GL.ONE_MINUS_SRC_ALPHA);
			_GL.blendFunc(_GL.ONE, _GL.ONE_MINUS_SRC_ALPHA);
		}

		function _EnableScreenBlending()
		{
			if (_BlendMode === 2)
			{
				return;
			}
			_BlendMode = 2;
			_GL.enable(_GL.BLEND);
			_GL.blendFuncSeparate(_GL.ONE, _GL.ONE_MINUS_SRC_COLOR, _GL.ONE, _GL.ONE_MINUS_SRC_ALPHA);
		}

		function _EnableMultiplyBlending()
		{
			if (_BlendMode === 3)
			{
				return;
			}
			_BlendMode = 3;
			_GL.enable(_GL.BLEND);
			_GL.blendFuncSeparate(_GL.DST_COLOR, _GL.ONE_MINUS_SRC_ALPHA, _GL.DST_ALPHA, _GL.ONE_MINUS_SRC_ALPHA);
		}

		function _EnablePremultipliedBlending()
		{
			if (_BlendMode === 4)
			{
				return;
			}
			_BlendMode = 4;
			_GL.enable(_GL.BLEND);
			_GL.blendFuncSeparate(_GL.ONE, _GL.ONE_MINUS_SRC_ALPHA, _GL.ONE, _GL.ONE_MINUS_SRC_ALPHA);
		}

		function _EnableAdditiveBlending()
		{
			if (_BlendMode === 5)
			{
				return;
			}
			_BlendMode = 5;
			_GL.enable(_GL.BLEND);
			_GL.blendFuncSeparate(_GL.ONE, _GL.ONE, _GL.ONE, _GL.ONE);
		}

		function VertexBuffer(id)
		{
			let _Size = 0;
			this.update = function(data)
			{
				_GL.bindBuffer(_GL.ARRAY_BUFFER, id);
				_GL.bufferData(_GL.ARRAY_BUFFER, data instanceof Float32Array ? data : new Float32Array(data), _GL.DYNAMIC_DRAW);

				_Size = data.length;
			};

			this.__defineGetter__("id", function()
			{
				return id;
			});

			this.__defineGetter__("size", function()
			{
				return _Size;
			});

			this.dispose = function()
			{
				_GL.deleteBuffer(id);
			};
		}

		function _MakeVertexBuffer(data)
		{
			let buffer = _GL.createBuffer();
			let vtxBuffer = new VertexBuffer(buffer);
			if (data)
			{
				vtxBuffer.update(data);
			}

			return vtxBuffer;
		}

		function IndexBuffer(id)
		{
			let _Size = 0;

			this.update = function(data)
			{
				_GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, id);
				_GL.bufferData(_GL.ELEMENT_ARRAY_BUFFER, data instanceof Uint16Array ? data : new Uint16Array(data), _GL.DYNAMIC_DRAW);

				_Size = data.length;
			};

			this.__defineGetter__("id", function()
			{
				return id;
			});

			this.__defineGetter__("size", function()
			{
				return _Size;
			});

			this.dispose = function()
			{
				_GL.deleteBuffer(id);
			};
		}

		function _MakeIndexBuffer(data)
		{
			let buffer = _GL.createBuffer();
			let indexBuffer = new IndexBuffer(buffer);
			if (data)
			{
				indexBuffer.update(data);
			}

			return indexBuffer;
		}

		function _InitializeShader(s)
		{
			if (!(s.fragment = _GetShader(s.fragment)))
			{
				return null;
			}
			if (!(s.vertex = _GetShader(s.vertex)))
			{
				return null;
			}
			s.program = _GL.createProgram();

			_GL.attachShader(s.program, s.vertex);
			_GL.attachShader(s.program, s.fragment);
			_GL.linkProgram(s.program);

			if (!_GL.getProgramParameter(s.program, _GL.LINK_STATUS))
			{
				console.log("Could not link shader", s.name, _GL.getProgramInfoLog(s.program));
			}
			else
			{
				_GL.useProgram(s.program);

				for (let a in s.attributes)
				{
					if ((s.attributes[a].index = _GL.getAttribLocation(s.program, s.attributes[a].name)) == -1)
					{
						console.log("Could not find attribute", s.attributes[a].name, "for shader", s.name);
					}
				}
				if (s.attributes2)
				{
					for (let a in s.attributes2)
					{
						if ((s.attributes2[a].index = _GL.getAttribLocation(s.program, s.attributes2[a].name)) == -1)
						{
							console.log("Could not find attribute", s.attributes2[a].name, "for shader", s.name);
						}
					}
				}
				for (let u in s.uniforms)
				{
					let name = s.uniforms[u];
					if ((s.uniforms[u] = _GL.getUniformLocation(s.program, name)) == null)
					{
						console.log("Could not find uniform", name, "for shader", s.name);
					}
				}
			}

			return s;
		}

		function _GetShader(id)
		{
			let s = _CompiledShaders.get(id);
			if (s)
			{
				return s;
			}

			let shader = null;

			let shaderScript = _ShaderSources[id];
			if (shaderScript)
			{
				if (id.indexOf(".fs") == id.length - 3)
				{
					shader = _GL.createShader(_GL.FRAGMENT_SHADER);
				}
				else if (id.indexOf(".vs") == id.length - 3)
				{
					shader = _GL.createShader(_GL.VERTEX_SHADER);
				}

				_GL.shaderSource(shader, shaderScript);
				_GL.compileShader(shader);

				if (!_GL.getShaderParameter(shader, _GL.COMPILE_STATUS))
				{
					console.log("Failed to compile", id);
					return null;
				}
				_CompiledShaders.set(id, shader);
			}
			return shader;
		}

		let _CompiledShaders = new Map();
		let _ShaderSources = {
			"Textured.vs": "attribute vec2 VertexPosition; attribute vec2 VertexTexCoord; uniform mat4 ProjectionMatrix; uniform mat4 WorldMatrix; uniform mat4 ViewMatrix; varying vec2 TexCoord; void main(void) {TexCoord = VertexTexCoord; vec4 pos = ViewMatrix * WorldMatrix * vec4(VertexPosition.x, VertexPosition.y, 0.0, 1.0); gl_Position = ProjectionMatrix * vec4(pos.xyz, 1.0); }",
			"Textured.fs": "#ifdef GL_ES \nprecision highp float;\n #endif\n uniform vec4 Color; uniform float Opacity; uniform sampler2D TextureSampler; varying vec2 TexCoord; void main(void) {vec4 color = texture2D(TextureSampler, TexCoord) * Color * Opacity; gl_FragColor = color; }",
			"TexturedSkin.vs": "attribute vec2 VertexPosition; attribute vec2 VertexTexCoord; attribute vec4 VertexBoneIndices; attribute vec4 VertexWeights; uniform mat4 ProjectionMatrix; uniform mat4 WorldMatrix; uniform mat4 ViewMatrix; uniform vec3 BoneMatrices[82]; varying vec2 TexCoord; void main(void) {TexCoord = VertexTexCoord; vec2 position = vec2(0.0, 0.0); vec4 p = WorldMatrix * vec4(VertexPosition.x, VertexPosition.y, 0.0, 1.0); float x = p[0]; float y = p[1]; for(int i = 0; i < 4; i++) {float weight = VertexWeights[i]; int matrixIndex = int(VertexBoneIndices[i])*2; vec3 m = BoneMatrices[matrixIndex]; vec3 n = BoneMatrices[matrixIndex+1]; position[0] += (m[0] * x + m[2] * y + n[1]) * weight; position[1] += (m[1] * x + n[0] * y + n[2]) * weight; } vec4 pos = ViewMatrix * vec4(position.x, position.y, 0.0, 1.0); gl_Position = ProjectionMatrix * vec4(pos.xyz, 1.0); }"
		};

		let _TexturedShader = _InitializeShader(
		{
			name: "TexturedShader",

			vertex: "Textured.vs",
			fragment: "Textured.fs",

			attributes:
			{
				VertexPosition:
				{
					name: "VertexPosition",
					size: 2,
					stride: 16,
					offset: 0
				},
				VertexNormal:
				{
					name: "VertexTexCoord",
					size: 2,
					stride: 16,
					offset: 8
				}
			},

			uniforms:
			{
				ProjectionMatrix: "ProjectionMatrix",
				ViewMatrix: "ViewMatrix",
				WorldMatrix: "WorldMatrix",
				TextureSampler: "TextureSampler",
				Opacity: "Opacity",
				Color: "Color"
			}
		});

		let _DeformedTexturedShader = _InitializeShader(
		{
			name: "DeformedTexturedShader",

			vertex: "Textured.vs",
			fragment: "Textured.fs",

			attributes:
			{
				VertexNormal:
				{
					name: "VertexTexCoord",
					size: 2,
					stride: 16,
					offset: 8
				}
			},

			attributes2:
			{
				VertexPosition:
				{
					name: "VertexPosition",
					size: 2,
					stride: 8,
					offset: 0
				}
			},

			uniforms:
			{
				ProjectionMatrix: "ProjectionMatrix",
				ViewMatrix: "ViewMatrix",
				WorldMatrix: "WorldMatrix",
				TextureSampler: "TextureSampler",
				Opacity: "Opacity",
				Color: "Color"
			}
		});

		let _TexturedSkinShader = _InitializeShader(
		{
			name: "TexturedSkinShader",

			vertex: "TexturedSkin.vs",
			fragment: "Textured.fs",

			attributes:
			{
				VertexPosition:
				{
					name: "VertexPosition",
					size: 2,
					stride: 48,
					offset: 0
				},
				VertexNormal:
				{
					name: "VertexTexCoord",
					size: 2,
					stride: 48,
					offset: 8
				},
				VertexBoneIndices:
				{
					name: "VertexBoneIndices",
					size: 4,
					stride: 48,
					offset: 16
				},
				VertexWeights:
				{
					name: "VertexWeights",
					size: 4,
					stride: 48,
					offset: 32
				}
			},

			uniforms:
			{
				ProjectionMatrix: "ProjectionMatrix",
				ViewMatrix: "ViewMatrix",
				WorldMatrix: "WorldMatrix",
				TextureSampler: "TextureSampler",
				Opacity: "Opacity",
				Color: "Color",
				BoneMatrices: "BoneMatrices"
			}
		});

		let _DeformedTexturedSkinShader = _InitializeShader(
		{
			name: "DeformedTexturedSkinShader",

			vertex: "TexturedSkin.vs",
			fragment: "Textured.fs",

			attributes:
			{
				VertexTexCoord:
				{
					name: "VertexTexCoord",
					size: 2,
					stride: 48,
					offset: 8
				},
				VertexBoneIndices:
				{
					name: "VertexBoneIndices",
					size: 4,
					stride: 48,
					offset: 16
				},
				VertexWeights:
				{
					name: "VertexWeights",
					size: 4,
					stride: 48,
					offset: 32
				}
			},

			attributes2:
			{
				VertexPosition:
				{
					name: "VertexPosition",
					size: 2,
					stride: 8,
					offset: 0
				}
			},

			uniforms:
			{
				ProjectionMatrix: "ProjectionMatrix",
				ViewMatrix: "ViewMatrix",
				WorldMatrix: "WorldMatrix",
				TextureSampler: "TextureSampler",
				Opacity: "Opacity",
				Color: "Color",
				BoneMatrices: "BoneMatrices"
			}
		});


		function _SetView(view)
		{
			_ViewTransform[0] = view[0];
			_ViewTransform[1] = view[1];
			_ViewTransform[4] = view[2];
			_ViewTransform[5] = view[3];
			_ViewTransform[12] = view[4];
			_ViewTransform[13] = view[5];
		}

		function _DrawTextured(transform, vertexBuffer, indexBuffer, opacity, color, tex)
		{
			_Transform[0] = transform[0];
			_Transform[1] = transform[1];
			_Transform[4] = transform[2];
			_Transform[5] = transform[3];
			_Transform[12] = transform[4];
			_Transform[13] = transform[5];

			let uniforms = _TexturedShader.uniforms;
			if(_Bind(_TexturedShader, vertexBuffer.id))
			{
				_GL.uniformMatrix4fv(uniforms.ViewMatrix, false, _ViewTransform);
				_GL.uniformMatrix4fv(uniforms.ProjectionMatrix, false, _Projection);
			}

			for (let i = 0; i < 4; i++) _ColorBuffer[i] = color[i];

			_GL.uniform1f(uniforms.Opacity, opacity);
			_GL.uniform4fv(uniforms.Color, _ColorBuffer);

			_GL.uniformMatrix4fv(uniforms.WorldMatrix, false, _Transform);

			_GL.activeTexture(_GL.TEXTURE0);
			_GL.bindTexture(_GL.TEXTURE_2D, tex);
			_GL.uniform1i(uniforms.TextureSampler, 0);

			_GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, indexBuffer.id);
			_GL.drawElements(_GL.TRIANGLES, indexBuffer.size, _GL.UNSIGNED_SHORT, 0);
		}

		function _DrawTexturedAndDeformed(transform, deformBuffer, vertexBuffer, indexBuffer, opacity, color, tex)
		{
			_Transform[0] = transform[0];
			_Transform[1] = transform[1];
			_Transform[4] = transform[2];
			_Transform[5] = transform[3];
			_Transform[12] = transform[4];
			_Transform[13] = transform[5];

			let uniforms = _DeformedTexturedShader.uniforms;
			if(_Bind(_DeformedTexturedShader, vertexBuffer.id, deformBuffer.id))
			{
				_GL.uniformMatrix4fv(uniforms.ViewMatrix, false, _ViewTransform);
				_GL.uniformMatrix4fv(uniforms.ProjectionMatrix, false, _Projection);
			}

			for (let i = 0; i < 4; i++) _ColorBuffer[i] = color[i];

			_GL.uniform1f(uniforms.Opacity, opacity);
			_GL.uniform4fv(uniforms.Color, _ColorBuffer);

			_GL.uniformMatrix4fv(uniforms.WorldMatrix, false, _Transform);

			_GL.activeTexture(_GL.TEXTURE0);
			_GL.bindTexture(_GL.TEXTURE_2D, tex);
			_GL.uniform1i(uniforms.TextureSampler, 0);

			_GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, indexBuffer.id);
			_GL.drawElements(_GL.TRIANGLES, indexBuffer.size, _GL.UNSIGNED_SHORT, 0);
		}

		function _DrawTexturedSkin(transform, vertexBuffer, indexBuffer, boneMatrices, opacity, color, tex)
		{
			_Transform[0] = transform[0];
			_Transform[1] = transform[1];
			_Transform[4] = transform[2];
			_Transform[5] = transform[3];
			_Transform[12] = transform[4];
			_Transform[13] = transform[5];

			let uniforms = _TexturedSkinShader.uniforms;
			if(_Bind(_TexturedSkinShader, vertexBuffer.id))
			{
				_GL.uniformMatrix4fv(uniforms.ViewMatrix, false, _ViewTransform);
				_GL.uniformMatrix4fv(uniforms.ProjectionMatrix, false, _Projection);
			}

			for (let i = 0; i < 4; i++) _ColorBuffer[i] = color[i];

			_GL.uniform1f(uniforms.Opacity, opacity);
			_GL.uniform4fv(uniforms.Color, _ColorBuffer);
			_GL.uniform3fv(uniforms.BoneMatrices, boneMatrices);

			_GL.uniformMatrix4fv(uniforms.WorldMatrix, false, _Transform);

			_GL.activeTexture(_GL.TEXTURE0);
			_GL.bindTexture(_GL.TEXTURE_2D, tex);
			_GL.uniform1i(uniforms.TextureSampler, 0);

			_GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, indexBuffer.id);
			_GL.drawElements(_GL.TRIANGLES, indexBuffer.size, _GL.UNSIGNED_SHORT, 0);
		}

		function _DrawTexturedAndDeformedSkin(transform, deformBuffer, vertexBuffer, indexBuffer, boneMatrices, opacity, color, tex)
		{
			_Transform[0] = transform[0];
			_Transform[1] = transform[1];
			_Transform[4] = transform[2];
			_Transform[5] = transform[3];
			_Transform[12] = transform[4];
			_Transform[13] = transform[5];

			let uniforms = _DeformedTexturedSkinShader.uniforms;
			if(_Bind(_DeformedTexturedSkinShader, vertexBuffer.id, deformBuffer.id))
			{
				_GL.uniformMatrix4fv(uniforms.ViewMatrix, false, _ViewTransform);
				_GL.uniformMatrix4fv(uniforms.ProjectionMatrix, false, _Projection);
			}

			for (let i = 0; i < 4; i++) _ColorBuffer[i] = color[i];

			_GL.uniform1f(uniforms.Opacity, opacity);
			_GL.uniform4fv(uniforms.Color, _ColorBuffer);
			_GL.uniform3fv(uniforms.BoneMatrices, boneMatrices);

			_GL.uniformMatrix4fv(uniforms.WorldMatrix, false, _Transform);

			_GL.activeTexture(_GL.TEXTURE0);
			_GL.bindTexture(_GL.TEXTURE_2D, tex);
			_GL.uniform1i(uniforms.TextureSampler, 0);

			_GL.bindBuffer(_GL.ELEMENT_ARRAY_BUFFER, indexBuffer.id);
			_GL.drawElements(_GL.TRIANGLES, indexBuffer.size, _GL.UNSIGNED_SHORT, 0);
		}

		function _Dispose()
		{
			_GL.deleteProgram(_DeformedTexturedSkinShader.program);
			_GL.deleteProgram(_TexturedSkinShader.program);
			_GL.deleteProgram(_DeformedTexturedShader.program);
			_GL.deleteProgram(_TexturedShader.program);

			for(let [key, shader] of _CompiledShaders)
			{
				_GL.deleteShader(shader);
			}
		}

		this.loadTexture = _LoadTexture;
		this.deleteTexture = _DeleteTexture;
		this.setSize = _SetSize;
		this.disableBlending = _DisableBlending;
		this.enableBlending = _EnableBlending;
		this.enablePremultipliedBlending = _EnablePremultipliedBlending;
		this.enableAdditiveBlending = _EnableAdditiveBlending;
		this.enableScreenBlending = _EnableScreenBlending;
		this.enableMultiplyBlending = _EnableMultiplyBlending;
		this.clear = _Clear;
		this.makeVertexBuffer = _MakeVertexBuffer;
		this.makeIndexBuffer = _MakeIndexBuffer;
		this.drawTextured = _DrawTextured;
		this.drawTexturedAndDeformed = _DrawTexturedAndDeformed;
		this.drawTexturedSkin = _DrawTexturedSkin;
		this.drawTexturedAndDeformedSkin = _DrawTexturedAndDeformedSkin;
		this.setView = _SetView;
		this.dispose = _Dispose;

		this.overrideProjection = function(projection)
		{
			_Projection = projection;
		};
		this.overrideView = function(view)
		{
			_ViewTransform = view;
		};

		this.__defineGetter__("viewportWidth", function()
		{
			return _ViewportWidth;
		});

		this.__defineGetter__("viewportHeight", function()
		{
			return _ViewportHeight;
		});
	}
}