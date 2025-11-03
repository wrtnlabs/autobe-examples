import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminShipmentTrackingsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentTracking> {
  const { admin, id } = props;

  const shipmentTracking =
    await MyGlobal.prisma.shopping_mall_shipment_trackings.findFirst({
      where: { id, deleted_at: null },
    });

  if (shipmentTracking === null) {
    throw new HttpException("Shipment tracking record not found", 404);
  }

  return {
    id: shipmentTracking.id,
    shopping_mall_order_id: shipmentTracking.shopping_mall_order_id,
    tracking_number: shipmentTracking.tracking_number,
    carrier_name: shipmentTracking.carrier_name,
    shipping_status: shipmentTracking.shipping_status,
    shipped_at: toISOStringSafe(shipmentTracking.shipped_at),
    delivered_at: shipmentTracking.delivered_at
      ? toISOStringSafe(shipmentTracking.delivered_at)
      : null,
    created_at: toISOStringSafe(shipmentTracking.created_at),
    updated_at: toISOStringSafe(shipmentTracking.updated_at),
    deleted_at: shipmentTracking.deleted_at
      ? toISOStringSafe(shipmentTracking.deleted_at)
      : null,
  };
}
