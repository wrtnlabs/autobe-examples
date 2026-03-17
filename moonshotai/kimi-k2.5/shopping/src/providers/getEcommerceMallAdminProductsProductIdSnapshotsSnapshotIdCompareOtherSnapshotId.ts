import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IFieldComparison } from "@ORGANIZATION/PROJECT-api/lib/structures/IFieldComparison";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductSnapshotImageTransformer } from "../transformers/EcommerceMallProductSnapshotImageTransformer";
import { EcommerceMallProductSnapshotTransformer } from "../transformers/EcommerceMallProductSnapshotTransformer";
import { EcommerceMallProductVariantSnapshotTransformer } from "../transformers/EcommerceMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

function buildFieldComparison(
  beforeValue: string | null,
  afterValue: string | null,
): IFieldComparison {
  const changed = (beforeValue ?? "") !== (afterValue ?? "");
  return {
    before: beforeValue,
    after: afterValue,
    changed,
  };
}
function buildOptionValuesMap(
  optionValues: Array<{
    optionName: string;
    optionValue: string;
  }>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const ov of optionValues) {
    map[ov.optionName] = ov.optionValue;
  }
  return map;
}
function compareSnapshotImages(
  beforeImages: Prisma.ecommerce_mall_product_snapshot_imagesGetPayload<
    ReturnType<typeof EcommerceMallProductSnapshotImageTransformer.select>
  >[],
  afterImages: Prisma.ecommerce_mall_product_snapshot_imagesGetPayload<
    ReturnType<typeof EcommerceMallProductSnapshotImageTransformer.select>
  >[],
): NonNullable<IEcommerceMallProductSnapshot.IComparison["images"]> {
  const beforeMap = new Map(beforeImages.map((img) => [img.id, img]));
  const afterMap = new Map(afterImages.map((img) => [img.id, img]));
  const added: IEcommerceMallProductSnapshotImage.ISummary[] = [];
  const removed: IEcommerceMallProductSnapshotImage.ISummary[] = [];
  const reordered: IEcommerceMallProductSnapshotImage.ISummary[] = [];
  const unchanged: IEcommerceMallProductSnapshotImage.ISummary[] = [];
  for (const [id, img] of afterMap) {
    if (!beforeMap.has(id)) {
      added.push({
        id: img.id,
        imageUrl: img.url,
        displayOrder: img.display_order,
      } satisfies IEcommerceMallProductSnapshotImage.ISummary);
    }
  }
  for (const [id, img] of beforeMap) {
    if (!afterMap.has(id)) {
      removed.push({
        id: img.id,
        imageUrl: img.url,
        displayOrder: img.display_order,
      } satisfies IEcommerceMallProductSnapshotImage.ISummary);
    }
  }
  for (const id of beforeMap.keys()) {
    if (afterMap.has(id)) {
      const beforeImg = beforeMap.get(id)!;
      const afterImg = afterMap.get(id)!;
      if (beforeImg.display_order !== afterImg.display_order) {
        reordered.push({
          id: afterImg.id,
          imageUrl: afterImg.url,
          displayOrder: afterImg.display_order,
        } satisfies IEcommerceMallProductSnapshotImage.ISummary);
      } else {
        unchanged.push({
          id: afterImg.id,
          imageUrl: afterImg.url,
          displayOrder: afterImg.display_order,
        } satisfies IEcommerceMallProductSnapshotImage.ISummary);
      }
    }
  }
  return {
    added,
    removed,
    reordered,
    unchanged,
  };
}
function compareVariants(
  beforeVariants: IEcommerceMallProductVariantSnapshot[],
  afterVariants: IEcommerceMallProductVariantSnapshot[],
  beforeSnapshotCreatedAt: string & tags.Format<"date-time">,
  afterSnapshotCreatedAt: string & tags.Format<"date-time">,
): NonNullable<IEcommerceMallProductSnapshot.IComparison["variants"]> {
  const beforeMap = new Map(beforeVariants.map((v) => [v.productVariantId, v]));
  const afterMap = new Map(afterVariants.map((v) => [v.productVariantId, v]));
  const added: IEcommerceMallProductVariantSnapshot.ISummary[] = [];
  const removed: IEcommerceMallProductVariantSnapshot.ISummary[] = [];
  const modified: IEcommerceMallProductVariantSnapshot.ISnapshotCompare[] = [];
  const unchanged: IEcommerceMallProductVariantSnapshot.ISummary[] = [];
  for (const [variantId, v] of afterMap) {
    const optionMap = buildOptionValuesMap(v.optionValues);
    const summary: IEcommerceMallProductVariantSnapshot.ISummary = {
      id: v.id,
      variantId: v.productVariantId,
      skuCode: v.skuCode,
      price: v.price,
      optionValues: optionMap,
      createdAt: v.createdAt,
    };
    if (!beforeMap.has(variantId)) {
      added.push(summary);
      continue;
    }
    const beforeV = beforeMap.get(variantId)!;
    const beforeOpts = buildOptionValuesMap(beforeV.optionValues);
    const afterOpts = optionMap;
    const differences: IEcommerceMallProductVariantSnapshot.ISnapshotFieldDifference[] =
      [];
    if (beforeV.skuCode !== v.skuCode) {
      differences.push({
        fieldName: "skuCode",
        oldValue: beforeV.skuCode,
        newValue: v.skuCode,
      });
    }
    if (beforeV.price !== v.price) {
      differences.push({
        fieldName: "price",
        oldValue: String(beforeV.price),
        newValue: String(v.price),
      });
    }
    const allOptionKeys = new Set([
      ...Object.keys(beforeOpts),
      ...Object.keys(afterOpts),
    ]);
    for (const key of allOptionKeys) {
      const oldVal = beforeOpts[key] ?? "";
      const newVal = afterOpts[key] ?? "";
      if (oldVal !== newVal) {
        differences.push({
          fieldName: key,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }
    if (differences.length > 0) {
      modified.push({
        snapshotId: beforeV.id,
        otherSnapshotId: v.id,
        snapshotCreatedAt: beforeSnapshotCreatedAt,
        otherSnapshotCreatedAt: afterSnapshotCreatedAt,
        differences,
      } satisfies IEcommerceMallProductVariantSnapshot.ISnapshotCompare);
    } else {
      unchanged.push(summary);
    }
  }
  for (const [variantId, v] of beforeMap) {
    if (!afterMap.has(variantId)) {
      const optionMap = buildOptionValuesMap(v.optionValues);
      removed.push({
        id: v.id,
        variantId: v.productVariantId,
        skuCode: v.skuCode,
        price: v.price,
        optionValues: optionMap,
        createdAt: v.createdAt,
      } satisfies IEcommerceMallProductVariantSnapshot.ISummary);
    }
  }
  return {
    added,
    removed,
    modified,
    unchanged,
  };
}
export async function getEcommerceMallAdminProductsProductIdSnapshotsSnapshotIdCompareOtherSnapshotId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  otherSnapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductSnapshot.IComparison> {
  const [beforeSnapshotRaw, afterSnapshotRaw] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_product_snapshots.findUnique({
      where: { id: props.snapshotId },
      ...EcommerceMallProductSnapshotTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_product_snapshots.findUnique({
      where: { id: props.otherSnapshotId },
      ...EcommerceMallProductSnapshotTransformer.select(),
    }),
  ]);
  if (beforeSnapshotRaw === null || afterSnapshotRaw === null) {
    throw new HttpException("Snapshot not found", 404);
  }
  if (
    beforeSnapshotRaw.product_id !== props.productId ||
    afterSnapshotRaw.product_id !== props.productId
  ) {
    throw new HttpException(
      "Snapshot does not belong to specified product",
      404,
    );
  }
  const beforeSnapshot =
    await EcommerceMallProductSnapshotTransformer.transform(beforeSnapshotRaw);
  const afterSnapshot =
    await EcommerceMallProductSnapshotTransformer.transform(afterSnapshotRaw);
  const beforeCreatedAt = beforeSnapshot.createdAt;
  const afterCreatedAt = afterSnapshot.createdAt;
  const imagesComparison = compareSnapshotImages(
    beforeSnapshotRaw.images.sort((a, b) => a.display_order - b.display_order),
    afterSnapshotRaw.images.sort((a, b) => a.display_order - b.display_order),
  );
  const [beforeVariantsRaw, afterVariantsRaw] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: { productVariant: { product_id: props.productId } },
      ...EcommerceMallProductVariantSnapshotTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: { productVariant: { product_id: props.productId } },
      ...EcommerceMallProductVariantSnapshotTransformer.select(),
    }),
  ]);
  const beforeVariants = await ArrayUtil.asyncMap(
    beforeVariantsRaw,
    EcommerceMallProductVariantSnapshotTransformer.transform,
  );
  const afterVariants = await ArrayUtil.asyncMap(
    afterVariantsRaw,
    EcommerceMallProductVariantSnapshotTransformer.transform,
  );
  const variantsComparison = compareVariants(
    beforeVariants,
    afterVariants,
    beforeCreatedAt,
    afterCreatedAt,
  );
  const fieldDiff: NonNullable<
    IEcommerceMallProductSnapshot.IComparison["fieldDiff"]
  > = {
    name: buildFieldComparison(beforeSnapshot.name, afterSnapshot.name),
    description: buildFieldComparison(
      beforeSnapshot.description,
      afterSnapshot.description,
    ),
    basePrice: buildFieldComparison(
      String(beforeSnapshot.basePrice),
      String(afterSnapshot.basePrice),
    ),
    categoryId: buildFieldComparison(
      beforeSnapshot.categoryId,
      afterSnapshot.categoryId,
    ),
  };
  return {
    beforeSnapshotId: beforeSnapshot.id,
    afterSnapshotId: afterSnapshot.id,
    beforeSnapshotCreatedAt: beforeCreatedAt,
    afterSnapshotCreatedAt: afterCreatedAt,
    fieldDiff,
    images: imagesComparison,
    variants: variantsComparison,
  } satisfies IEcommerceMallProductSnapshot.IComparison;
}
