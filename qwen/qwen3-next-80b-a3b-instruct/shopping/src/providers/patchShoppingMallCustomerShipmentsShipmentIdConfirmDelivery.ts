import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerShipmentsShipmentIdConfirmDelivery(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  // Validate shipment exists and belongs to customer
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: {
      id: true,
      status: true,
      shopping_mall_order_item_id: true,
      carrier: true,
      tracking_number: true,
      estimated_delivery_date: true,
      created_at: true,
    },
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);
  // Verify order item has valid data and connection
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: shipment.shopping_mall_order_item_id },
    select: { id: true, status: true, order_id: true },
  });
  if (!orderItem) throw new HttpException("Order item not found", 404);
  // Verify customer has access to associated order
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderItem.order_id },
    select: { customer_id: true },
  });
  if (!order) throw new HttpException("Order not found", 404);
  // Verify authentication context matches order owner
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Access denied", 403);
  }
  // Validate status is 'shipped' - reject if already delivered
  if (shipment.status !== "shipped") {
    throw new HttpException("Shipment already delivered", 400);
  }
  // Update shipment status to 'delivered'
  const updatedShipment = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      status: "delivered",
    },
  });
  // Update associated order item status to 'delivered'
  await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: orderItem.id },
    data: {
      status: "delivered",
    },
  });
  // Record customer confirmation event in system_logs
  await MyGlobal.prisma.shopping_mall_system_logs.create({
    data: {
      id: props.shipmentId,
      event_type: "shipment_confirmed",
      severity: "info",
      metadata: JSON.stringify({
        customer_id: props.customer.id,
        shipment_id: props.shipmentId,
        confirmation_timestamp: toISOStringSafe(new Date()),
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Return updated shipment record with canonical date formatting
  return {
    id: updatedShipment.id,
    shopping_mall_order_item_id: updatedShipment.shopping_mall_order_item_id,
    carrier: updatedShipment.carrier,
    tracking_number: updatedShipment.tracking_number,
    status: updatedShipment.status,
    created_at: toISOStringSafe(updatedShipment.created_at),
    estimated_delivery_date: updatedShipment.estimated_delivery_date
      ? toISOStringSafe(updatedShipment.estimated_delivery_date)
      : null,
  } as IShoppingMallShipment;
}
