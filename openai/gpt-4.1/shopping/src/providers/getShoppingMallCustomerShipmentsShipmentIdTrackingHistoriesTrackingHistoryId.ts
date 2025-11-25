import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistory";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShipmentsShipmentIdTrackingHistoriesTrackingHistoryId(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentTrackingHistory> {
  // Step 1: Validate the shipment exists
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }

  // Step 2: Retrieve the tracking history and ensure it belongs to the shipment
  const trackingHistory =
    await MyGlobal.prisma.shopping_mall_shipment_tracking_histories.findUnique({
      where: { id: props.trackingHistoryId },
    });
  if (!trackingHistory || trackingHistory.shipment_id !== props.shipmentId) {
    throw new HttpException("Tracking event not found", 404);
  }

  // Step 3: Map the result to API DTO, converting all date-times to string
  return {
    id: trackingHistory.id,
    shipment_id: trackingHistory.shipment_id,
    event_time: toISOStringSafe(trackingHistory.event_time),
    location: trackingHistory.location ?? undefined,
    latitude: trackingHistory.latitude ?? undefined,
    longitude: trackingHistory.longitude ?? undefined,
    event_code: trackingHistory.event_code ?? undefined,
    status: trackingHistory.status,
    tracking_message: trackingHistory.tracking_message,
    created_at: toISOStringSafe(trackingHistory.created_at),
  };
}
