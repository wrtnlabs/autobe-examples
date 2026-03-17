import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentDeliveryTransformer } from "../transformers/EcommerceMallShipmentDeliveryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerShipmentsShipmentIdDeliveryConfirm(props: {
  customer: CustomerPayload;
  shipmentId: string;
}): Promise<IEcommerceMallShipmentDelivery> {
  // Verify shipment exists and belongs to customer's order
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findUnique({
    where: { id: props.shipmentId, deleted_at: null },
    select: { id: true, order_id: true },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  // Verify customer owns the order
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUnique({
    where: { id: shipment.order_id, deleted_at: null },
    select: { customer_id: true },
  });
  if (order === null || order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if delivery already confirmed
  const existingDelivery =
    await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.findUnique({
      where: { shipment_id: props.shipmentId },
      select: { id: true },
    });
  if (existingDelivery !== null) {
    throw new HttpException("Delivery already confirmed", 409);
  }
  // Get all order items in this shipment
  const shipmentItems =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
      where: { shipment_id: props.shipmentId },
      select: { order_item_id: true },
    });
  const orderItemIds = shipmentItems.map((si) => si.order_item_id);
  // Verify all items are in 'shipped' status
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: { id: { in: orderItemIds } },
    select: { id: true, status: true },
  });
  const notShippedItems = orderItems.filter((oi) => oi.status !== "shipped");
  if (notShippedItems.length > 0) {
    throw new HttpException("Some items are not in shipped status", 400);
  }
  const now: Date = new Date();
  const deliveryId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  // Create delivery record and update items in transaction
  const delivery = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Create delivery record
    const deliveryRecord =
      await prisma.ecommerce_mall_shipment_deliveries.create({
        data: {
          id: deliveryId,
          shipment: { connect: { id: props.shipmentId } },
          customer: { connect: { id: props.customer.id } },
          delivered_at: now,
          is_auto_delivered: false,
          created_at: now,
          updated_at: now,
        },
        ...EcommerceMallShipmentDeliveryTransformer.select(),
      });
    // Update all order items to delivered status
    await prisma.ecommerce_mall_order_items.updateMany({
      where: { id: { in: orderItemIds } },
      data: {
        status: "delivered",
        updated_at: now,
      },
    });
    return deliveryRecord;
  });
  return await EcommerceMallShipmentDeliveryTransformer.transform(delivery);
}
