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

export async function getShoppingMallSellerShipmentsShipmentIdTrackingHistoriesTrackingHistoryId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentTrackingHistory> {
  // Step 1: Fetch the shipment by shipmentId
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
    },
  });
  // If schema provides a seller ownership field (e.g., owner_id), check it here
  if (!shipment /* || shipment.seller_id !== props.seller.id */) {
    throw new HttpException("Shipment not found or not owned by seller", 404);
  }

  // Step 2: Retrieve the shipment tracking history event for this shipment
  const tracking =
    await MyGlobal.prisma.shopping_mall_shipment_tracking_histories.findFirst({
      where: {
        id: props.trackingHistoryId,
        shipment_id: props.shipmentId,
      },
    });
  if (!tracking) {
    throw new HttpException("Shipment tracking history not found", 404);
  }

  // Step 3: Map API response fields per IShoppingMallShipmentTrackingHistory DTO
  return {
    id: tracking.id,
    shipment_id: tracking.shipment_id,
    event_time: toISOStringSafe(tracking.event_time),
    location: tracking.location === null ? null : tracking.location,
    latitude: tracking.latitude === null ? null : tracking.latitude,
    longitude: tracking.longitude === null ? null : tracking.longitude,
    event_code: tracking.event_code === null ? null : tracking.event_code,
    status: tracking.status,
    tracking_message: tracking.tracking_message,
    created_at: toISOStringSafe(tracking.created_at),
  };
}
