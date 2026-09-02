/**
 * Lumina Gallery - Lightweight Client-Side EXIF Metadata Parser
 * Reads JPEG APP1 markers and TIFF headers to extract camera, lens, and exposure data.
 */

export class ExifParser {
    static async parse(file) {
        if (!file || !(file instanceof Blob)) return null;

        try {
            const buffer = await this.readFileSlice(file, 128 * 1024); // read first 128KB
            const dataView = new DataView(buffer);

            // Verify JPEG SOI marker (0xFFD8)
            if (dataView.getUint16(0) !== 0xFFD8) {
                return null;
            }

            let offset = 2;
            const length = dataView.byteLength;

            while (offset < length - 4) {
                const marker = dataView.getUint16(offset);
                offset += 2;

                if (marker === 0xFFE1) {
                    const app1Length = dataView.getUint16(offset);
                    offset += 2;
                    return this.parseApp1(dataView, offset, app1Length);
                } else if ((marker & 0xFF00) === 0xFF00 && marker !== 0xFF00) {
                    const markerLength = dataView.getUint16(offset);
                    offset += markerLength;
                } else {
                    break;
                }
            }
        } catch (err) {
            console.warn('EXIF parsing failed gracefully:', err);
        }
        return null;
    }

    static readFileSlice(file, size) {
        return new Promise((resolve, reject) => {
            const slice = file.slice(0, size);
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(slice);
        });
    }

    static parseApp1(dataView, offset, length) {
        const exifHeader = String.fromCharCode(
            dataView.getUint8(offset),
            dataView.getUint8(offset + 1),
            dataView.getUint8(offset + 2),
            dataView.getUint8(offset + 3)
        );

        if (exifHeader !== 'Exif') return null;

        const tiffOffset = offset + 6;
        const byteOrderMark = dataView.getUint16(tiffOffset);
        const littleEndian = byteOrderMark === 0x4949;

        if (dataView.getUint16(tiffOffset + 2, littleEndian) !== 0x002A) {
            return null;
        }

        const ifd0Offset = dataView.getUint32(tiffOffset + 4, littleEndian);
        const tags = {};

        this.readIFD(dataView, tiffOffset, tiffOffset + ifd0Offset, littleEndian, tags);

        if (tags[0x8769]) {
            this.readIFD(dataView, tiffOffset, tiffOffset + tags[0x8769], littleEndian, tags);
        }

        return this.formatTags(tags);
    }

    static readIFD(dataView, tiffOffset, offset, littleEndian, tags) {
        try {
            if (offset >= dataView.byteLength - 2) return;
            const entriesCount = dataView.getUint16(offset, littleEndian);
            offset += 2;

            for (let i = 0; i < entriesCount; i++) {
                const entryOffset = offset + i * 12;
                if (entryOffset + 12 > dataView.byteLength) break;

                const tag = dataView.getUint16(entryOffset, littleEndian);
                const type = dataView.getUint16(entryOffset + 2, littleEndian);
                const count = dataView.getUint32(entryOffset + 4, littleEndian);
                const valueOffset = entryOffset + 8;

                const val = this.readTagValue(dataView, tiffOffset, valueOffset, type, count, littleEndian);
                if (val !== undefined) {
                    tags[tag] = val;
                }
            }
        } catch (e) {
            console.warn('Error reading IFD:', e);
        }
    }

    static readTagValue(dataView, tiffOffset, valueOffset, type, count, littleEndian) {
        try {
            if (type === 2) {
                let stringOffset = valueOffset;
                if (count > 4) {
                    stringOffset = tiffOffset + dataView.getUint32(valueOffset, littleEndian);
                }
                let str = '';
                for (let i = 0; i < count - 1; i++) {
                    if (stringOffset + i >= dataView.byteLength) break;
                    const charCode = dataView.getUint8(stringOffset + i);
                    if (charCode === 0) break;
                    str += String.fromCharCode(charCode);
                }
                return str.trim();
            } else if (type === 3) {
                return dataView.getUint16(valueOffset, littleEndian);
            } else if (type === 4) {
                return dataView.getUint32(valueOffset, littleEndian);
            } else if (type === 5 || type === 10) {
                const realOffset = tiffOffset + dataView.getUint32(valueOffset, littleEndian);
                if (realOffset + 8 > dataView.byteLength) return null;
                const num = type === 5 ? dataView.getUint32(realOffset, littleEndian) : dataView.getInt32(realOffset, littleEndian);
                const den = type === 5 ? dataView.getUint32(realOffset + 4, littleEndian) : dataView.getInt32(realOffset + 4, littleEndian);
                return den !== 0 ? { numerator: num, denominator: den, value: num / den } : null;
            }
        } catch (err) {
            return null;
        }
        return null;
    }

    static formatTags(tags) {
        const result = {
            cameraMake: tags[0x010F] || '',
            cameraModel: tags[0x0110] || '',
            lensModel: tags[0xA434] || tags[0xFDE9] || '',
            dateTaken: tags[0x9003] || tags[0x0132] || '',
            aperture: '',
            shutterSpeed: '',
            iso: tags[0x8827] ? `ISO ${tags[0x8827]}` : '',
            focalLength: ''
        };

        if (result.cameraMake && result.cameraModel && !result.cameraModel.toLowerCase().includes(result.cameraMake.toLowerCase())) {
            result.camera = `${result.cameraMake} ${result.cameraModel}`.trim();
        } else {
            result.camera = result.cameraModel || result.cameraMake || 'Unknown Camera';
        }

        const fNumber = tags[0x829D];
        if (fNumber && fNumber.value) {
            const val = fNumber.value;
            result.aperture = `ƒ/${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}`;
        }

        const expTime = tags[0x829A];
        if (expTime && expTime.value) {
            if (expTime.value < 1) {
                result.shutterSpeed = `1/${Math.round(1 / expTime.value)}s`;
            } else {
                result.shutterSpeed = `${expTime.value % 1 === 0 ? expTime.value.toFixed(0) : expTime.value.toFixed(1)}s`;
            }
        }

        const focal = tags[0x920A];
        if (focal && focal.value) {
            result.focalLength = `${Math.round(focal.value)}mm`;
        }

        if (result.dateTaken && result.dateTaken.includes(':')) {
            const parts = result.dateTaken.split(' ');
            const dateParts = parts[0].replace(/:/g, '-');
            result.dateTaken = dateParts;
        }

        return result;
    }
}
