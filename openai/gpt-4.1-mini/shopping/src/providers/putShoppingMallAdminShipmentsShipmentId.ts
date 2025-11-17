import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShipmentsShipmentId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  const existing = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });

  if (!existing) {
    throw new HttpException("Shipment not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      shipping_carrier: props.body.shipping_carrier ?? undefined,
      tracking_number: props.body.tracking_number ?? undefined,
      shipment_status: props.body.status ?? undefined,
      shipped_at:
        props.body.shipped_at === null
          ? null
          : (props.body.shipped_at ?? undefined),
      delivered_at:
        props.body.delivered_at === null
          ? null
          : (props.body.delivered_at ?? undefined),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shipping_carrier: updated.shipping_carrier,
    tracking_number: updated.tracking_number,
    status: typia.assert<
      "pending" | "shipped" | "in_transit" | "delivered" | "cancelled"
    >(updated.shipment_status),
    shipped_at:
      updated.shipped_at === null ? null : toISOStringSafe(updated.shipped_at),
    delivered_at:
      updated.delivered_at === null
        ? null
        : toISOStringSafe(updated.delivered_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
