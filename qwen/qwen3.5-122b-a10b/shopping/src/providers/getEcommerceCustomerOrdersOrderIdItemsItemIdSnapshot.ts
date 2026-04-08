import { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceOrderItemSnapshotTransformer } from "../transformers/EcommerceOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerOrdersOrderIdItemsItemIdSnapshot(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceOrderItemSnapshot> {
  // Verify the order exists and belongs to the authenticated customer
  const order = await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { ecommerce_customer_id: true },
  });
  if (order.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the order item exists and belongs to the specified order
  await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
    where: {
      id: props.itemId,
      ecommerce_order_id: props.orderId,
    },
  });
  // Fetch the snapshot using the transformer's select
  const snapshot =
    await MyGlobal.prisma.ecommerce_order_item_snapshots.findUniqueOrThrow({
      where: { ecommerce_order_item_id: props.itemId },
      ...EcommerceOrderItemSnapshotTransformer.select(),
    });
  return await EcommerceOrderItemSnapshotTransformer.transform(snapshot);
}
