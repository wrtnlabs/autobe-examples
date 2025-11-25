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

export async function postShoppingMallAdminShipmentsShipmentIdTrackingHistories(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentTrackingHistory.ICreate;
}): Promise<IShoppingMallShipmentTrackingHistory> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  const created =
    await MyGlobal.prisma.shopping_mall_shipment_tracking_histories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shipment_id: props.shipmentId,
        event_time: props.body.event_time,
        location:
          typeof props.body.location === "undefined"
            ? null
            : props.body.location,
        latitude:
          typeof props.body.latitude === "undefined"
            ? null
            : props.body.latitude,
        longitude:
          typeof props.body.longitude === "undefined"
            ? null
            : props.body.longitude,
        event_code:
          typeof props.body.event_code === "undefined"
            ? null
            : props.body.event_code,
        status: props.body.status,
        tracking_message: props.body.tracking_message,
        created_at: toISOStringSafe(new Date()),
      },
    });
  return {
    id: created.id,
    shipment_id: created.shipment_id,
    event_time: toISOStringSafe(created.event_time),
    location: created.location ?? undefined,
    latitude: created.latitude ?? undefined,
    longitude: created.longitude ?? undefined,
    event_code: created.event_code ?? undefined,
    status: created.status,
    tracking_message: created.tracking_message,
    created_at: toISOStringSafe(created.created_at),
  };
}
