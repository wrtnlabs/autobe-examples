import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShipmentsShipmentId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the shipment (must exist)
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }

  // 2. Validate shipment status (must not be in transit, delivered, cancelled, or returned)
  const NON_DELETABLE_STATUSES = [
    "in_transit",
    "delivered",
    "cancelled",
    "returned",
  ];
  if (NON_DELETABLE_STATUSES.includes(shipment.status)) {
    throw new HttpException(
      `Cannot delete shipment in status '${shipment.status}'. Only shipments in cancellable statuses may be deleted.`,
      409,
    );
  }

  // 3. Check for tracking histories
  const trackingCount =
    await MyGlobal.prisma.shopping_mall_shipment_tracking_histories.count({
      where: { shipment_id: props.shipmentId },
    });
  if (trackingCount > 0) {
    throw new HttpException(
      "Cannot delete shipment: It has tracking history records.",
      409,
    );
  }

  // 4. Do hard delete
  await MyGlobal.prisma.shopping_mall_shipments.delete({
    where: { id: props.shipmentId },
  });
  // No return value: void
}
