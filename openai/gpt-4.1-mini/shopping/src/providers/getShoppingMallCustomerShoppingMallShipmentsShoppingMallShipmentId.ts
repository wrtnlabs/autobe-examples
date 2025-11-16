import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShoppingMallShipmentsShoppingMallShipmentId(props: {
  customer: CustomerPayload;
  shoppingMallShipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  // Find shipment record without nested select
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shoppingMallShipmentId },
    select: {
      id: true,
      shopping_mall_order_id: true,
      shipping_method: true,
      tracking_number: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }

  // Query related order to get customer_id
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: shipment.shopping_mall_order_id },
    select: { shopping_mall_customer_id: true },
  });

  // Validate ownership
  if (order === null || order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Unauthorized access", 403);
  }

  return {
    id: shipment.id,
    shoppingMallOrderId: shipment.shopping_mall_order_id,
    shippingMethod: shipment.shipping_method,
    trackingNumber:
      shipment.tracking_number === null ? undefined : shipment.tracking_number,
    status: shipment.status,
    createdAt: toISOStringSafe(shipment.created_at),
    updatedAt: toISOStringSafe(shipment.updated_at),
    deletedAt:
      shipment.deleted_at === null
        ? null
        : toISOStringSafe(shipment.deleted_at),
  };
}
