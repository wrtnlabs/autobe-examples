import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminProductsProductIdVariantsVariantIdSnapshotsSnapshotIdCompareOtherSnapshotId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  otherSnapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductVariantSnapshot.ISnapshotCompare> {
  // Verify variant exists and belongs to the product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { product_id: true },
    });
  if (variant.product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      404,
    );
  }
  // Fetch first snapshot with option values
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          product_variant_id: props.variantId,
        },
        select: {
          id: true,
          sku_code: true,
          price: true,
          created_at: true,
          optionValues: {
            select: {
              option_name: true,
              option_value: true,
            },
          },
        } satisfies Prisma.ecommerce_mall_product_variant_snapshotsFindUniqueArgs["select"],
      },
    );
  // Fetch second snapshot with option values
  const otherSnapshot =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.otherSnapshotId,
          product_variant_id: props.variantId,
        },
        select: {
          id: true,
          sku_code: true,
          price: true,
          created_at: true,
          optionValues: {
            select: {
              option_name: true,
              option_value: true,
            },
          },
        } satisfies Prisma.ecommerce_mall_product_variant_snapshotsFindUniqueArgs["select"],
      },
    );
  // Build differences array
  const differences: IEcommerceMallProductVariantSnapshot.ISnapshotFieldDifference[] =
    [];
  // Compare sku_code
  if (snapshot.sku_code !== otherSnapshot.sku_code) {
    differences.push({
      fieldName: "skuCode",
      oldValue: snapshot.sku_code,
      newValue: otherSnapshot.sku_code,
    } satisfies IEcommerceMallProductVariantSnapshot.ISnapshotFieldDifference);
  }
  // Compare price
  if (snapshot.price !== otherSnapshot.price) {
    differences.push({
      fieldName: "price",
      oldValue: snapshot.price.toString(),
      newValue: otherSnapshot.price.toString(),
    } satisfies IEcommerceMallProductVariantSnapshot.ISnapshotFieldDifference);
  }
  // Build option value maps for comparison
  const snapshotOptions = new Map<string, string>();
  const otherSnapshotOptions = new Map<string, string>();
  for (const opt of snapshot.optionValues) {
    snapshotOptions.set(opt.option_name, opt.option_value);
  }
  for (const opt of otherSnapshot.optionValues) {
    otherSnapshotOptions.set(opt.option_name, opt.option_value);
  }
  // Get all unique option names from both snapshots
  const allOptionNames = new Set<string>([
    ...snapshotOptions.keys(),
    ...otherSnapshotOptions.keys(),
  ]);
  // Compare option values
  for (const optionName of allOptionNames) {
    const oldValue = snapshotOptions.get(optionName) ?? "";
    const newValue = otherSnapshotOptions.get(optionName) ?? "";
    if (oldValue !== newValue) {
      differences.push({
        fieldName: optionName,
        oldValue,
        newValue,
      } satisfies IEcommerceMallProductVariantSnapshot.ISnapshotFieldDifference);
    }
  }
  return {
    snapshotId: snapshot.id,
    otherSnapshotId: otherSnapshot.id,
    snapshotCreatedAt: snapshot.created_at.toISOString(),
    otherSnapshotCreatedAt: otherSnapshot.created_at.toISOString(),
    differences,
  } satisfies IEcommerceMallProductVariantSnapshot.ISnapshotCompare;
}
