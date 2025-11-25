import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShipmentsShipmentIdTrackingHistoriesTrackingHistoryId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingHistoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Confirm tracking history exists and is linked to correct shipment
  const trackingHistory =
    await MyGlobal.prisma.shopping_mall_shipment_tracking_histories.findUnique({
      where: {
        id: props.trackingHistoryId,
      },
    });
  if (!trackingHistory || trackingHistory.shipment_id !== props.shipmentId) {
    throw new HttpException(
      "Tracking history entry not found for this shipment.",
      404,
    );
  }
  // 2. Hard delete the tracking history record
  await MyGlobal.prisma.shopping_mall_shipment_tracking_histories.delete({
    where: {
      id: props.trackingHistoryId,
    },
  });
}
