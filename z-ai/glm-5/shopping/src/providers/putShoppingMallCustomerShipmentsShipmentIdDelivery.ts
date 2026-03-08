import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerShipmentsShipmentIdDelivery(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  // 1. Find shipment with order relation to verify ownership
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        order: {
          select: {
            id: true,
            shopping_mall_customer_id: true,
          },
        },
        delivered_at: true,
      },
    });
  // 2. Verify customer ownership
  if (shipment.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check if already delivered
  if (shipment.delivered_at !== null) {
    throw new HttpException("Shipment already delivered", 400);
  }
  const now = new Date();
  // 4. Get all order items to determine final order status
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: { shopping_mall_order_id: shipment.order.id },
    select: { status: true },
  });
  // 5. Derive order status after this shipment's items become delivered
  const statuses = orderItems.map((item) => item.status);
  // Items in this shipment will change from 'shipped' to 'delivered'
  const updatedStatuses = statuses.map((status) =>
    status === "shipped" ? "delivered" : status,
  );
  const orderStatus = deriveOrderStatus(updatedStatuses);
  // 6. Execute all updates in a single transaction
  await MyGlobal.prisma.$transaction([
    // Update shipment delivered_at
    MyGlobal.prisma.shopping_mall_shipments.update({
      where: { id: props.shipmentId },
      data: {
        delivered_at: now,
        updated_at: now,
      },
    }),
    // Update all order items in this shipment to delivered
    MyGlobal.prisma.shopping_mall_order_items.updateMany({
      where: { shopping_mall_shipment_id: props.shipmentId },
      data: {
        status: "delivered",
        updated_at: now,
      },
    }),
    // Update order status
    MyGlobal.prisma.shopping_mall_orders.update({
      where: { id: shipment.order.id },
      data: {
        status: orderStatus,
        updated_at: now,
      },
    }),
  ]);
  // 7. Fetch and return updated shipment
  const updatedShipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...ShoppingMallShipmentTransformer.select(),
    });
  return ShoppingMallShipmentTransformer.transform(updatedShipment);
}
function deriveOrderStatus(statuses: string[]): string {
  const uniqueStatuses = new Set(statuses);
  // All items have the same status
  if (uniqueStatuses.size === 1) {
    return Array.from(uniqueStatuses)[0] as
      | "paid"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "refunded";
  }
  // Mixed states = partially_completed
  return "partially_completed";
}
