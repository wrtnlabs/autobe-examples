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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallProductSnapshotTransformer } from "../transformers/ShoppingMallProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminSellersSellerIdProductsProductIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshot> {
  // Step 1: Verify the product exists and belongs to the given seller.
  // Deleted products (deleted_at != null) are still accessible for snapshot viewing.
  await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.sellerId,
    },
    select: { id: true },
  });
  // Step 2: Retrieve the specific snapshot, scoped to the product.
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        product_id: props.productId,
      },
      ...ShoppingMallProductSnapshotTransformer.select(),
    });
  // Step 3: Transform and return
  return ShoppingMallProductSnapshotTransformer.transform(snapshot);
}
