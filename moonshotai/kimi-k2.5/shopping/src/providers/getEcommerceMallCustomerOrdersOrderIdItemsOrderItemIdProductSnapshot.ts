import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemProductSnapshotTransformer } from "../transformers/EcommerceMallOrderItemProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrdersOrderIdItemsOrderItemIdProductSnapshot(props: {
  customer: CustomerPayload;
  orderId: string;
  orderItemId: string;
}): Promise<IEcommerceMallOrderItemProductSnapshot> {
  // Verify order item exists and belongs to the specified order, and customer owns it
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        order_id: true,
      },
    });
  // Verify order item belongs to the specified order
  if (orderItem.order_id !== props.orderId) {
    throw new HttpException("Order item not found in specified order", 404);
  }
  // Fetch order to verify customer ownership
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      customer_id: true,
    },
  });
  // Verify customer owns the order
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve product snapshot with images
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_product_snapshots.findUniqueOrThrow(
      {
        where: { order_item_id: props.orderItemId },
        ...EcommerceMallOrderItemProductSnapshotTransformer.select(),
      },
    );
  return await EcommerceMallOrderItemProductSnapshotTransformer.transform(
    snapshot,
  );
}
