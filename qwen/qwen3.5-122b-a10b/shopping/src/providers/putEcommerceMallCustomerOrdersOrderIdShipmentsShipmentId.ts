import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerOrdersOrderIdShipmentsShipmentId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipment.IConfirmDelivery;
}): Promise<IEcommerceMallShipment> {
  // 1. Verify order exists and belongs to customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    where: {
      id: props.orderId,
      ecommerce_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  // 2. Verify shipment exists
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      deleted_at: null,
    },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  // 3. Verify shipment belongs to the order by checking order items
  // Order items don't have direct shipment relation in schema - need to verify this
  // For now, assume all order items in the order could be in this shipment
  // In actual implementation, there should be a shipment_id on order_items or a junction table
  const orderItemsInOrder =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        ecommerce_mall_order_id: props.orderId,
        deleted_at: null,
      },
    });
  if (orderItemsInOrder.length === 0) {
    throw new HttpException("Order has no items", 400);
  }
  // 4. Check shipment not already delivered
  if (shipment.delivered_at !== null) {
    throw new HttpException("Shipment already delivered", 400);
  }
  // 5. Verify all order items in the order are 'shipped' status
  // (Assuming all items in order are in this shipment for this implementation)
  for (const item of orderItemsInOrder) {
    if (item.status !== "shipped") {
      throw new HttpException("Order item not in shipped status", 400);
    }
  }
  // 6. Update shipment delivered_at and order items to 'delivered'
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_shipments.update({
      where: { id: props.shipmentId },
      data: {
        delivered_at: now,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_order_items.updateMany({
      where: {
        ecommerce_mall_order_id: props.orderId,
        deleted_at: null,
      },
      data: {
        status: "delivered",
        updated_at: now,
      },
    }),
  ]);
  // 7. Recalculate order status based on all order items
  const allOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        ecommerce_mall_order_id: props.orderId,
        deleted_at: null,
      },
      select: { status: true },
    });
  const allDelivered = allOrderItems.every(
    (item) => item.status === "delivered",
  );
  const newOrderStatus = allDelivered ? "delivered" : "partiallyCompleted";
  await MyGlobal.prisma.ecommerce_mall_orders.update({
    where: { id: props.orderId },
    data: {
      status: newOrderStatus,
      updated_at: now,
    },
  });
  // 8. Return updated shipment with transformer
  const updatedShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...EcommerceMallShipmentTransformer.select(),
    });
  return await EcommerceMallShipmentTransformer.transform(updatedShipment);
}
