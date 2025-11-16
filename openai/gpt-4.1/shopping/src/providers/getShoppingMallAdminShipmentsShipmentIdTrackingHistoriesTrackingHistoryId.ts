import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminShipmentsShipmentIdTrackingHistoriesTrackingHistoryId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentTrackingHistory> {
  const record =
    await MyGlobal.prisma.shopping_mall_shipment_tracking_histories.findFirst({
      where: {
        id: props.trackingHistoryId,
        shipment_id: props.shipmentId,
      },
    });

  if (!record) {
    throw new HttpException("Tracking event not found for this shipment.", 404);
  }

  return {
    id: record.id,
    shipment_id: record.shipment_id,
    event_time:
      typeof record.event_time === "string"
        ? record.event_time
        : toISOStringSafe(record.event_time),
    location:
      record.location === undefined
        ? undefined
        : record.location === null
          ? null
          : record.location,
    latitude:
      record.latitude === undefined
        ? undefined
        : record.latitude === null
          ? null
          : record.latitude,
    longitude:
      record.longitude === undefined
        ? undefined
        : record.longitude === null
          ? null
          : record.longitude,
    event_code:
      record.event_code === undefined
        ? undefined
        : record.event_code === null
          ? null
          : record.event_code,
    status: record.status,
    tracking_message: record.tracking_message,
    created_at:
      typeof record.created_at === "string"
        ? record.created_at
        : toISOStringSafe(record.created_at),
  };
}
