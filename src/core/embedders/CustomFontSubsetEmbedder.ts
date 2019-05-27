import { Glyph, Subset } from '@pdf-lib/fontkit';

import CustomFontEmbedder from 'src/core/embedders/CustomFontEmbedder';
import PDFHexString from 'src/core/objects/PDFHexString';
import { Cache, mergeUint8Arrays, toHexStringOfMinLength } from 'src/utils';

class CustomFontSubsetEmbedder extends CustomFontEmbedder {
  static for = (fontData: Uint8Array) => new CustomFontSubsetEmbedder(fontData);

  private readonly subset: Subset;
  private readonly glyphs: Glyph[];
  private readonly glyphIdMap: Map<number, number>;

  private constructor(fontData: Uint8Array) {
    super(fontData);

    this.subset = this.font.createSubset();
    this.glyphs = [];
    this.glyphCache = Cache.populatedBy(() => this.glyphs);
    this.glyphIdMap = new Map();
  }

  encodeText(text: string): PDFHexString {
    const { glyphs } = this.font.layout(text);
    const hexCodes = new Array(glyphs.length);

    for (let idx = 0, len = glyphs.length; idx < len; idx++) {
      const glyph = glyphs[idx];
      const subsetGlyphId = this.subset.includeGlyph(glyph);

      this.glyphs[subsetGlyphId - 1] = glyph;
      this.glyphIdMap.set(glyph.id, subsetGlyphId);

      hexCodes[idx] = toHexStringOfMinLength(subsetGlyphId, 4);
    }

    this.glyphCache.invalidate();
    return PDFHexString.of(hexCodes.join(''));
  }

  protected isCFF(): boolean {
    return (this.subset as any).cff;
  }

  protected glyphId(glyph?: Glyph): number {
    return glyph ? this.glyphIdMap.get(glyph.id)! : -1;
  }

  protected serializeFont(): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const parts: Uint8Array[] = [];
      this.subset
        .encodeStream()
        .on('data', (bytes) => parts.push(bytes))
        .on('end', () => resolve(mergeUint8Arrays(parts)))
        .on('error' as any, (err) => reject(err));
    });
  }
}

export default CustomFontSubsetEmbedder;