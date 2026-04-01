import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerOrdersItemsItemIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  itemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        product_name: true,
        product_description: true,
        variant_sku_code: true,
        variant_price: true,
        seller_shop_name: true,
        seller_shop_logo: true,
        created_at: true,
        orderItem: {
          select: {
            id: true,
            shopping_mall_seller_id: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
        variantOptions:
          ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer.select(),
      },
    });
  if (snapshot.orderItem.id !== props.itemId) {
    throw new HttpException("Snapshot not found for this order item", 404);
  }
  if (snapshot.orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: snapshot.id,
    orderItemId: snapshot.orderItem.id,
    productName: snapshot.product_name,
    productDescription: snapshot.product_description,
    variantSkuCode: snapshot.variant_sku_code,
    variantPrice: snapshot.variant_price,
    sellerShopName: snapshot.seller_shop_name,
    sellerShopLogo: snapshot.seller_shop_logo ?? null,
    createdAt: toISOStringSafe(snapshot.created_at),
    variantOptions: await ArrayUtil.asyncMap(
      snapshot.variantOptions,
      ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer.transform,
    ),
  };
}
