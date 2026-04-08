import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderItemSnapshotOptionAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemSnapshotOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerSellerOrderItemsOrderItemIdSnapshotOptions(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemSnapshotOption.ISummary> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: { id: true, shopping_mall_product_id: true },
    });
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: orderItem.shopping_mall_product_id },
      select: { id: true, shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findFirstOrThrow({
      where: { shopping_mall_order_item_id: props.orderItemId },
      select: { id: true },
    });
  const option =
    await MyGlobal.prisma.shopping_mall_order_item_snapshot_options.findFirstOrThrow(
      {
        where: { shopping_mall_order_item_snapshot_id: snapshot.id },
        ...ShoppingMallOrderItemSnapshotOptionAtSummaryTransformer.select(),
      },
    );
  return await ShoppingMallOrderItemSnapshotOptionAtSummaryTransformer.transform(
    option,
  );
}
