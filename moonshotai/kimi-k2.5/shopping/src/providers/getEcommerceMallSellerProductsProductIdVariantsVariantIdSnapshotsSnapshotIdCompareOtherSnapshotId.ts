import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductsProductIdVariantsVariantIdSnapshotsSnapshotIdCompareOtherSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  otherSnapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductVariantSnapshot.ISnapshotCompare> {
  // Verify product exists and seller owns it
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden - you do not own this product", 403);
  }
  // Verify variant belongs to the product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, product_id: true },
    });
  if (variant.product_id !== props.productId) {
    throw new HttpException("Variant does not belong to this product", 404);
  }
  // Fetch both snapshots with their option values in parallel
  const [snapshot, otherSnapshot] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        product_variant_id: true,
        sku_code: true,
        price: true,
        created_at: true,
        optionValues: {
          select: {
            option_name: true,
            option_value: true,
          },
        } satisfies Prisma.ecommerce_mall_product_variant_snapshot_option_valuesFindManyArgs,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUniqueOrThrow({
      where: { id: props.otherSnapshotId },
      select: {
        id: true,
        product_variant_id: true,
        sku_code: true,
        price: true,
        created_at: true,
        optionValues: {
          select: {
            option_name: true,
            option_value: true,
          },
        } satisfies Prisma.ecommerce_mall_product_variant_snapshot_option_valuesFindManyArgs,
      },
    }),
  ]);
  // Verify both snapshots belong to the specified variant
  if (
    snapshot.product_variant_id !== props.variantId ||
    otherSnapshot.product_variant_id !== props.variantId
  ) {
    throw new HttpException(
      "One or both snapshots do not belong to this variant",
      404,
    );
  }
  // Build option value maps for comparison
  const snapshotOptions = new Map<string, string>();
  for (const ov of snapshot.optionValues) {
    snapshotOptions.set(ov.option_name, ov.option_value);
  }
  const otherSnapshotOptions = new Map<string, string>();
  for (const ov of otherSnapshot.optionValues) {
    otherSnapshotOptions.set(ov.option_name, ov.option_value);
  }
  // Compare fields and build differences
  const differences: IEcommerceMallProductVariantSnapshot.ISnapshotFieldDifference[] =
    [];
  // Compare SKU code
  if (snapshot.sku_code !== otherSnapshot.sku_code) {
    differences.push({
      fieldName: "skuCode",
      oldValue: snapshot.sku_code,
      newValue: otherSnapshot.sku_code,
    });
  }
  // Compare price
  if (snapshot.price !== otherSnapshot.price) {
    differences.push({
      fieldName: "price",
      oldValue: snapshot.price.toString(),
      newValue: otherSnapshot.price.toString(),
    });
  }
  // Compare option values - find all unique keys
  const allOptionKeys = new Set([
    ...snapshotOptions.keys(),
    ...otherSnapshotOptions.keys(),
  ]);
  for (const key of allOptionKeys) {
    const oldValue = snapshotOptions.get(key);
    const newValue = otherSnapshotOptions.get(key);
    if (oldValue !== newValue) {
      differences.push({
        fieldName: key,
        oldValue: oldValue ?? "",
        newValue: newValue ?? "",
      });
    }
  }
  // Sort differences by field name for consistent output
  differences.sort((a, b) => a.fieldName.localeCompare(b.fieldName));
  return {
    snapshotId: props.snapshotId,
    otherSnapshotId: props.otherSnapshotId,
    snapshotCreatedAt: toISOStringSafe(snapshot.created_at),
    otherSnapshotCreatedAt: toISOStringSafe(otherSnapshot.created_at),
    differences,
  };
}
