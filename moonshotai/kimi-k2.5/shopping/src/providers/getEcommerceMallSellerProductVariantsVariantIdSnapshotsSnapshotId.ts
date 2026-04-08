import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantSnapshotTransformer } from "../transformers/EcommerceMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductVariantsVariantIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  variantId: string;
  snapshotId: string;
}): Promise<IEcommerceMallProductVariantSnapshot> {
  // For sellers: verify variant ownership first through product_variants -> products
  if (props.seller.type === "seller") {
    const variantWithProduct =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
        where: { id: props.variantId },
        select: {
          id: true,
          product: {
            select: {
              seller_id: true,
            },
          },
        },
      });
    // Return 404 if variant doesn't exist
    if (variantWithProduct === null) {
      throw new HttpException("Snapshot not found", 404);
    }
    // Return 403 if seller doesn't own this variant
    if (variantWithProduct.product.seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Query the snapshot with all related data using transformer select
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUnique({
      where: { id: props.snapshotId },
      ...EcommerceMallProductVariantSnapshotTransformer.select(),
    });
  // Return 404 if snapshot not found
  if (snapshot === null) {
    throw new HttpException("Snapshot not found", 404);
  }
  // Verify variantId matches the snapshot's product_variant_id
  // Return 404 to prevent information leakage about snapshot existence under wrong variant
  if (snapshot.product_variant_id !== props.variantId) {
    throw new HttpException("Snapshot not found", 404);
  }
  // Transform and return the snapshot
  return await EcommerceMallProductVariantSnapshotTransformer.transform(
    snapshot,
  );
}
