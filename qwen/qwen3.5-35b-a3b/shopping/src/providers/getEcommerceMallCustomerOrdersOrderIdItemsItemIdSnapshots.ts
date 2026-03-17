import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemSnapshotTransformer } from "../transformers/EcommerceMallOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrdersOrderIdItemsItemIdSnapshots(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderItemSnapshot> {
  // Verify order belongs to customer and exists
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
    },
  });
  // Verify order item exists and belongs to the order using relation
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: props.itemId,
        order: {
          id: props.orderId,
        },
      },
    });
  // Get the most recent snapshot for this order item
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findFirst({
      where: {
        order_item_id: props.itemId,
      },
      orderBy: { created_at: "desc" },
      ...EcommerceMallOrderItemSnapshotTransformer.select(),
    });
  if (snapshot === null) {
    throw new HttpException("Order item snapshots not found", 404);
  }
  return await EcommerceMallOrderItemSnapshotTransformer.transform(snapshot);
}
