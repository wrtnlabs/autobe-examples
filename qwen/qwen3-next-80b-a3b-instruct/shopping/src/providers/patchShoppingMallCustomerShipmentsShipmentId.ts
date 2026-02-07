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

export async function patchShoppingMallCustomerShipmentsShipmentId(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IRequest;
}): Promise<IShoppingMallShipment> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: {
      id: true,
      status: true,
      created_at: true,
      shopping_mall_order_item_id: true,
      carrier: true,
      tracking_number: true,
      estimated_delivery_date: true,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.status !== "shipped") {
    throw new HttpException("Shipment status cannot be updated", 400);
  }
  // Verify customer owns this shipment
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: shipment.shopping_mall_order_item_id },
    select: { order: { select: { customer_id: true } } },
  });
  if (!orderItem || orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException(
      "Unauthorized: shipment does not belong to customer",
      403,
    );
  }
  // Get current time as ISO string
  const now = toISOStringSafe(new Date());
  // Calculate 14 days in milliseconds and compare
  const created_at_timestamp = new Date(shipment.created_at).getTime();
  const fourteen_days_in_ms = 14 * 24 * 60 * 60 * 1000;
  const fourteen_days_later_timestamp =
    created_at_timestamp + fourteen_days_in_ms;
  const now_timestamp = new Date(now).getTime();
  let newStatus: "delivered" | "auto-delivered";
  if (now_timestamp >= fourteen_days_later_timestamp) {
    newStatus = "auto-delivered";
  } else {
    newStatus = "delivered";
  }
  // Update shipment status
  const updatedShipment = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: { status: newStatus },
    select: {
      id: true,
      carrier: true,
      tracking_number: true,
      status: true,
      created_at: true,
      estimated_delivery_date: true,
      shopping_mall_order_item_id: true,
    },
  });
  // Return response with proper type-casted date strings
  return {
    id: updatedShipment.id,
    carrier: updatedShipment.carrier,
    tracking_number: updatedShipment.tracking_number,
    status: updatedShipment.status,
    created_at: toISOStringSafe(updatedShipment.created_at) as string &
      tags.Format<"date-time">,
    estimated_delivery_date: updatedShipment.estimated_delivery_date
      ? (toISOStringSafe(updatedShipment.estimated_delivery_date) as string &
          tags.Format<"date-time">)
      : null,
    shopping_mall_order_item_id: updatedShipment.shopping_mall_order_item_id,
  };
}
