import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrdersOrderIdConfirmDeliveryShipmentId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { shopping_mall_customer_id: true },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch shipment basic info without shopping_mall_order_id (since not present)
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: { id: true, status: true },
    });
  // Find related order items linked to this shipment
  const shipmentOrderItems =
    await MyGlobal.prisma.shopping_mall_shipment_order_items.findMany({
      where: { shopping_mall_shipment_id: props.shipmentId },
      select: { shopping_mall_order_item_id: true },
    });
  if (shipmentOrderItems.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  // Find one order id of these order items
  // To do this, fetch the first order item to get its shopping_mall_order_id
  const firstOrderItemId = shipmentOrderItems[0].shopping_mall_order_item_id;
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: firstOrderItemId },
      select: { shopping_mall_order_id: true },
    });
  if (orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_shipments.update({
      where: { id: props.shipmentId },
      data: { status: "delivered" },
    });
    await tx.shopping_mall_order_items.updateMany({
      where: {
        id: {
          in: shipmentOrderItems.map((x) => x.shopping_mall_order_item_id),
        },
      },
      data: { status: "delivered" },
    });
  });
  const updated = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    ...ShoppingMallOrderTransformer.select(),
  });
  return await ShoppingMallOrderTransformer.transform(updated);
}
