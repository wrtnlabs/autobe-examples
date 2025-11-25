import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShipmentsShipmentIdTrackingHistoriesTrackingHistoryId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingHistoryId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentTrackingHistory.IUpdate;
}): Promise<IShoppingMallShipmentTrackingHistory> {
  // 1. Check if the target tracking event exists and belongs to the shipment
  const tracking =
    await MyGlobal.prisma.shopping_mall_shipment_tracking_histories.findUnique({
      where: {
        id: props.trackingHistoryId,
      },
    });
  if (!tracking || tracking.shipment_id !== props.shipmentId) {
    throw new HttpException(
      "Tracking history not found for the specified shipment.",
      404,
    );
  }

  // 2. Prepare only allowed update fields
  const updateFields: Record<string, unknown> = {};
  if (props.body.event_time !== undefined)
    updateFields.event_time = props.body.event_time;
  if ("location" in props.body)
    updateFields.location =
      props.body.location === undefined ? null : props.body.location;
  if ("latitude" in props.body)
    updateFields.latitude =
      props.body.latitude === undefined ? null : props.body.latitude;
  if ("longitude" in props.body)
    updateFields.longitude =
      props.body.longitude === undefined ? null : props.body.longitude;
  if ("event_code" in props.body)
    updateFields.event_code =
      props.body.event_code === undefined ? null : props.body.event_code;
  if (props.body.status !== undefined) updateFields.status = props.body.status;
  if (props.body.tracking_message !== undefined)
    updateFields.tracking_message = props.body.tracking_message;

  // 3. Update the record
  const updated =
    await MyGlobal.prisma.shopping_mall_shipment_tracking_histories.update({
      where: {
        id: props.trackingHistoryId,
      },
      data: updateFields,
    });

  // 4. Return the updated DTO (matching null/undefined rules exactly)
  return {
    id: updated.id,
    shipment_id: updated.shipment_id,
    event_time: toISOStringSafe(updated.event_time),
    location: updated.location,
    latitude: updated.latitude,
    longitude: updated.longitude,
    event_code: updated.event_code,
    status: updated.status,
    tracking_message: updated.tracking_message,
    created_at: toISOStringSafe(updated.created_at),
  };
}
