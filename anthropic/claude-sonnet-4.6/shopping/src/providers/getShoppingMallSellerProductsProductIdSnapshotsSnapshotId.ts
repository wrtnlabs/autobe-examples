import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
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
import { ShoppingMallProductSnapshotTransformer } from "../transformers/ShoppingMallProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshot> {
  // Step 1: Find the product (including soft-deleted ones)
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    },
  );
  // Step 2: Seller ownership check
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Find the snapshot, scoped to this product
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        product_id: props.productId,
      },
      ...ShoppingMallProductSnapshotTransformer.select(),
    });
  // Step 4: Transform and return
  return ShoppingMallProductSnapshotTransformer.transform(snapshot);
}
