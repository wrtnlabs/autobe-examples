import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductSnapshotSkusOptionTransformer } from "../transformers/ShoppingMallProductSnapshotSkusOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkusesSkuIdOptionsOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshotSkusOption> {
  // Step 1: Verify product exists and belongs to the authenticated seller
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify snapshot exists and belongs to the product
  await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
    where: { id: props.snapshotId, product_id: props.productId },
    select: { id: true },
  });
  // Step 3: Verify snapshot SKU exists and belongs to the snapshot
  await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.findFirstOrThrow({
    where: { id: props.skuId, product_snapshot_id: props.snapshotId },
    select: { id: true },
  });
  // Step 4: Retrieve the option record with transformer select
  const option =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skus_options.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        ...ShoppingMallProductSnapshotSkusOptionTransformer.select(),
      },
    );
  // Validate hierarchy: option must belong to the specified skuId
  if (option.product_snapshot_skus_id !== props.skuId) {
    throw new HttpException("Not Found", 404);
  }
  return ShoppingMallProductSnapshotSkusOptionTransformer.transform(option);
}
