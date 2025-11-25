import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerShipmentsShipmentIdTrackingHistories(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentTrackingHistory.ICreate;
}): Promise<IShoppingMallShipmentTrackingHistory> {
  // Step 1: Verify the parent shipment exists and is owned by the seller
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: { id: true, created_by_seller_id: true, cancelled_at: true },
  });
  if (!shipment) throw new HttpException("Shipment not found.", 404);
  if (shipment.created_by_seller_id !== props.seller.id)
    throw new HttpException("Forbidden: You do not own this shipment.", 403);
  if (shipment.cancelled_at !== null)
    throw new HttpException(
      "Cannot append tracking events to a cancelled shipment.",
      400,
    );

  // Step 2: Insert the new tracking history event
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_shipment_tracking_histories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shipment_id: props.shipmentId,
        event_time: props.body.event_time,
        location: props.body.location ?? null,
        latitude: props.body.latitude ?? null,
        longitude: props.body.longitude ?? null,
        event_code: props.body.event_code ?? null,
        status: props.body.status,
        tracking_message: props.body.tracking_message,
        created_at: now,
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
