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

export async function getShoppingMallCustomerShipmentsShipmentId(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });

  if (!shipment || shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }

  return {
    id: shipment.id,
    shopping_mall_order_id: shipment.shopping_mall_order_id,
    shipping_carrier: shipment.shipping_carrier,
    tracking_number: shipment.tracking_number,
    status:
      shipment.shipment_status === "pending"
        ? "pending"
        : shipment.shipment_status === "shipped"
          ? "shipped"
          : shipment.shipment_status === "in_transit"
            ? "in_transit"
            : shipment.shipment_status === "delivered"
              ? "delivered"
              : "cancelled",
    shipped_at: shipment.shipped_at
      ? toISOStringSafe(shipment.shipped_at)
      : null,
    delivered_at: shipment.delivered_at
      ? toISOStringSafe(shipment.delivered_at)
      : null,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
  };
}
