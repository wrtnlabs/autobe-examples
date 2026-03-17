import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductSnapshotSkusTransformer } from "../transformers/ShoppingMallProductSnapshotSkusTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkusesSkuId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshotSkus> {
  // Step 1: Find the product (including soft-deleted, to determine deletion status)
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
      },
    });
  // Step 2: Authorization check
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate snapshot belongs to this product
  await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
    where: {
      id: props.snapshotId,
      product_id: props.productId,
    },
    select: { id: true },
  });
  // Step 4: Load the SKU record (with options via transformer select)
  const sku =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.findFirstOrThrow(
      {
        where: {
          id: props.skuId,
          product_snapshot_id: props.snapshotId,
        },
        ...ShoppingMallProductSnapshotSkusTransformer.select(),
      },
    );
  // Step 5: Transform and return
  return ShoppingMallProductSnapshotSkusTransformer.transform(sku);
}
