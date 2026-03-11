import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
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
  orderId: string;
  itemId: string;
}): Promise<IShoppingMallOrderItemSnapshot> {
  // Step 1: Find the order item and verify it belongs to the specified order
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.itemId },
    select: {
      id: true,
      shopping_mall_order_id: true,
      order: {
        select: {
          id: true,
          shopping_mall_customer_id: true,
        },
      },
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Step 2: Validate order item belongs to the specified order
  if (orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Order item doesn't belong to specified order",
      400,
    );
  }
  // Step 3: Verify customer ownership of the order
  if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Retrieve the snapshot using transformer select
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findUnique({
      where: { order_item_id: props.itemId },
      ...ShoppingMallOrderItemSnapshotTransformer.select(),
    });
  if (snapshot === null) {
    throw new HttpException("Snapshot not found", 404);
  }
  // Step 5: Transform and return
  return await ShoppingMallOrderItemSnapshotTransformer.transform(snapshot);
}
