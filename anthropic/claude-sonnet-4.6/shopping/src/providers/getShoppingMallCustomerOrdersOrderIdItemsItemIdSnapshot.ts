import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemSnapshotTransformer } from "../transformers/ShoppingMallOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrdersOrderIdItemsItemIdSnapshot(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemSnapshot> {
  // Step 1: Validate the order exists and belongs to the authenticated customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirstOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Validate the order item exists and belongs to the given order
  await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
    },
    select: { id: true },
  });
  // Step 3: Load the immutable order item snapshot
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findUniqueOrThrow({
      where: { order_item_id: props.itemId },
      ...ShoppingMallOrderItemSnapshotTransformer.select(),
    });
  // Step 4: Transform and return the response
  return ShoppingMallOrderItemSnapshotTransformer.transform(snapshot);
}
