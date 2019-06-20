import PDFArray from 'src/core/objects/PDFArray';
import PDFDict, { DictMap } from 'src/core/objects/PDFDict';
import PDFName from 'src/core/objects/PDFName';
import PDFNumber from 'src/core/objects/PDFNumber';
import PDFObject from 'src/core/objects/PDFObject';
import PDFRef from 'src/core/objects/PDFRef';
import PDFStream from 'src/core/objects/PDFStream';
import PDFContext from 'src/core/PDFContext';
import PDFPageTree from 'src/core/structures/PDFPageTree';

class PDFPageLeaf extends PDFDict {
  static readonly InheritableEntries = [
    'Resources',
    'MediaBox',
    'CropBox',
    'Rotate',
  ];

  static withContextAndParent = (context: PDFContext, parent: PDFRef) => {
    const dict = new Map();
    dict.set(PDFName.of('Type'), PDFName.of('Page'));
    dict.set(PDFName.of('Parent'), parent);
    dict.set(PDFName.of('Resources'), context.obj({}));
    dict.set(PDFName.of('MediaBox'), context.obj([0, 0, 612, 792]));
    return new PDFPageLeaf(dict, context);
  };

  static fromMapWithContext = (map: DictMap, context: PDFContext) =>
    new PDFPageLeaf(map, context);

  private normalized = false;

  clone(context?: PDFContext): PDFPageLeaf {
    const clone = PDFPageLeaf.fromMapWithContext(
      new Map(),
      context || this.context,
    );
    const entries = this.entries();
    for (let idx = 0, len = entries.length; idx < len; idx++) {
      const [key, value] = entries[idx];
      clone.set(key, value);
    }
    return clone;
  }

  Parent(): PDFPageTree {
    return this.lookup(PDFName.of('Parent')) as PDFPageTree;
  }

  Contents(): PDFStream | PDFArray | undefined {
    return this.lookup(PDFName.of('Contents')) as
      | PDFStream
      | PDFArray
      | undefined;
  }

  Annots(): PDFArray | undefined {
    return this.lookup(PDFName.of('Annots')) as PDFArray | undefined;
  }

  BleedBox(): PDFArray | undefined {
    return this.lookup(PDFName.of('BleedBox')) as PDFArray | undefined;
  }

  TrimBox(): PDFArray | undefined {
    return this.lookup(PDFName.of('TrimBox')) as PDFArray | undefined;
  }

  Resources(): PDFDict {
    const dictOrRef = this.getInheritableAttribute(PDFName.of('Resources'));
    return this.context.lookup(dictOrRef, PDFDict);
  }

  MediaBox(): PDFArray {
    const arrayOrRef = this.getInheritableAttribute(PDFName.of('MediaBox'));
    return this.context.lookup(arrayOrRef, PDFArray);
  }

  CropBox(): PDFArray | undefined {
    const maybeArrayOrRef = this.getInheritableAttribute(PDFName.of('CropBox'));
    return this.context.lookup(maybeArrayOrRef) as PDFArray | undefined;
  }

  Rotate(): PDFNumber {
    const numberOrRef = this.getInheritableAttribute(PDFName.of('Rotate'));
    return this.context.lookup(numberOrRef, PDFNumber);
  }

  getInheritableAttribute(name: PDFName): PDFObject | undefined {
    let attribute: PDFObject | undefined;
    this.ascend((node) => {
      if (!attribute) attribute = node.get(name);
    });
    return attribute;
  }

  setParent(parentRef: PDFRef): void {
    this.set(PDFName.of('Parent'), parentRef);
  }

  addContentStream(contentStreamRef: PDFRef): void {
    this.assertNormalized();
    let Contents = this.Contents();
    if (!Contents) {
      Contents = this.context.obj([]);
      this.set(PDFName.of('Contents'), Contents);
    }
    (Contents as PDFArray).push(contentStreamRef);
  }

  setFontDictionary(name: PDFName, fontDictRef: PDFRef): void {
    this.assertNormalized();
    const Font = this.Resources().lookup(PDFName.of('Font'), PDFDict);
    Font.set(name, fontDictRef);
  }

  setXObject(name: PDFName, xObjectRef: PDFRef): void {
    this.assertNormalized();
    const XObject = this.Resources().lookup(PDFName.of('XObject'), PDFDict);
    XObject.set(name, xObjectRef);
  }

  ascend(visitor: (node: PDFPageTree | PDFPageLeaf) => any): void {
    visitor(this);
    const Parent = this.Parent();
    if (Parent) Parent.ascend(visitor);
  }

  normalize(): void {
    const { context } = this;

    const contentsRef = this.get(PDFName.of('Contents'));
    const contents = this.context.lookup(contentsRef);
    if (contents instanceof PDFStream) {
      this.set(PDFName.of('Contents'), context.obj([contentsRef]));
    }

    const Resources = this.Resources() || context.obj({});
    this.set(PDFName.of('Resources'), Resources);

    const Font = Resources.lookup(PDFName.of('Font')) || context.obj({});
    Resources.set(PDFName.of('Font'), Font);

    const XObject = Resources.lookup(PDFName.of('XObject')) || context.obj({});
    Resources.set(PDFName.of('XObject'), XObject);

    this.normalized = true;
  }

  assertNormalized(): void {
    if (!this.normalized) throw new Error('FIX ME!!!');
  }
}

export default PDFPageLeaf;