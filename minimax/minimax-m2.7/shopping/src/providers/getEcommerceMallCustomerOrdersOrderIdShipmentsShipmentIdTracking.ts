import { IEcommerceMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTracking";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallCustomerOrdersOrderIdShipmentsShipmentIdTracking(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentTracking> {
  // 1. Verify the order exists and belongs to the customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUnique({
    where: { id: props.orderId },
    select: {
      id: true,
      ecommerce_mall_customer_id: true,
    },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify the shipment exists, is not deleted, and belongs to the specified order
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: {
      id: true,
      ecommerce_mall_order_id: true,
      carrier: true,
      tracking_number: true,
      created_at: true,
      deleted_at: true,
    },
  });
  // If shipment not found, is deleted, or doesn't belong to this order,
  // return 404 (do not reveal that shipment exists to prevent enumeration)
  if (
    shipment === null ||
    shipment.deleted_at !== null ||
    shipment.ecommerce_mall_order_id !== props.orderId
  ) {
    throw new HttpException("Shipment not found", 404);
  }
  // 3. Return tracking information
  return {
    carrier: shipment.carrier,
    trackingNumber: shipment.tracking_number,
    shippedAt: shipment.created_at.toISOString(),
  };
}
