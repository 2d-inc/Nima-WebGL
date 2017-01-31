var BinaryReader = (function()
{
	function BinaryReader(uint8Array)
	{
		this.isBigEndian = function()
		{
			var b = new ArrayBuffer(4);
			var a = new Uint32Array(b);
			var c = new Uint8Array(b);
			a[0] = 0xdeadbeef;
			return c[0] == 0xde;
		}();

		this.raw = uint8Array;
		this.dataView = new DataView(uint8Array.buffer);
		this.readIndex = 0;
	}

	BinaryReader.prototype.readFloat32 = function()
	{
		var v = this.dataView.getFloat32(this.readIndex, !this.isBigEndian);
		this.readIndex += 4;
		return v;
	};

	BinaryReader.prototype.readFloat32Array = function(ar, length)
	{
		if (!length)
		{
			length = ar.length;
		}
		for (var i = 0; i < length; i++)
		{
			ar[i] = this.dataView.getFloat32(this.readIndex, !this.isBigEndian);
			this.readIndex += 4;
		}
		return ar;
	};

	BinaryReader.prototype.readFloat64 = function()
	{
		var v = this.dataView.getFloat64(this.readIndex, !this.isBigEndian);
		this.readIndex += 8;
		return v;
	};

	BinaryReader.prototype.readUint8 = function()
	{
		return this.raw[this.readIndex++];
	};

	BinaryReader.prototype.isEOF = function()
	{
		return this.readIndex >= this.raw.length;
	};

	BinaryReader.prototype.readInt8 = function()
	{
		var v = this.dataView.getInt8(this.readIndex);
		this.readIndex += 1;
		return v;
	};

	BinaryReader.prototype.readUint16 = function()
	{
		var v = this.dataView.getUint16(this.readIndex, !this.isBigEndian);
		this.readIndex += 2;
		return v;
	};

	BinaryReader.prototype.readUint16Array = function(ar, length)
	{
		if (!length)
		{
			length = ar.length;
		}
		for (var i = 0; i < length; i++)
		{
			ar[i] = this.dataView.getUint16(this.readIndex, !this.isBigEndian);
			this.readIndex += 2;
		}
		return ar;
	};

	BinaryReader.prototype.readInt16 = function()
	{
		var v = this.dataView.getInt16(this.readIndex, !this.isBigEndian);
		this.readIndex += 2;
		return v;
	};

	BinaryReader.prototype.readUint32 = function()
	{
		var v = this.dataView.getUint32(this.readIndex, !this.isBigEndian);
		this.readIndex += 4;
		return v;
	};

	BinaryReader.prototype.readInt32 = function()
	{
		var v = this.dataView.getInt32(this.readIndex, !this.isBigEndian);
		this.readIndex += 4;
		return v;
	};

	BinaryReader.prototype.byteArrayToString = function(bytes)
	{
		var out = [],
			pos = 0,
			c = 0;
		while (pos < bytes.length)
		{
			var c1 = bytes[pos++];
			if (c1 < 128)
			{
				out[c++] = String.fromCharCode(c1);
			}
			else if (c1 > 191 && c1 < 224)
			{
				var c2 = bytes[pos++];
				out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
			}
			else if (c1 > 239 && c1 < 365)
			{
				// Surrogate Pair
				var c2 = bytes[pos++];
				var c3 = bytes[pos++];
				var c4 = bytes[pos++];
				var u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) -
					0x10000;
				out[c++] = String.fromCharCode(0xD800 + (u >> 10));
				out[c++] = String.fromCharCode(0xDC00 + (u & 1023));
			}
			else
			{
				var c2 = bytes[pos++];
				var c3 = bytes[pos++];
				out[c++] =
					String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
			}
		}
		return out.join('');
	};

	BinaryReader.prototype.readString = function()
	{
		var length = this.readUint32();
		var ua = new Uint8Array(length);
		for (var i = 0; i < length; i++)
		{
			ua[i] = this.raw[this.readIndex++];
		}
		return this.byteArrayToString(ua);
	};

	BinaryReader.prototype.readRaw = function(to, length)
	{
		for (var i = 0; i < length; i++)
		{
			to[i] = this.raw[this.readIndex++];
		}
	};

	BinaryReader.alignment = 1024;

	return BinaryReader;
}());