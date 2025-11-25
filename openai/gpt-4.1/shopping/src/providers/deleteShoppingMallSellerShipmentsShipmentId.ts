import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Look up the shipment by ID
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  // Validate owner (created_by_seller_id matches actor)
  if (shipment.created_by_seller_id !== props.seller.id) {
    throw new HttpException(
      "You are not authorized to delete this shipment.",
      403,
    );
  }
  // Validate status (only allow if NOT delivered/in_transit/cancelled/returned)
  const forbiddenStatuses = [
    "in_transit",
    "delivered",
    "cancelled",
    "returned",
  ];
  if (forbiddenStatuses.includes(shipment.status)) {
    throw new HttpException(
      "Cannot delete shipment: status does not allow deletion.",
      400,
    );
  }
  // Validate: no tracking histories exist for this shipment
  const trackingExists =
    await MyGlobal.prisma.shopping_mall_shipment_tracking_histories.findFirst({
      where: { shipment_id: props.shipmentId },
    });
  if (trackingExists) {
    throw new HttpException(
      "Cannot delete shipment: tracking histories exist for this shipment.",
      400,
    );
  }
  // Delete the shipment
  await MyGlobal.prisma.shopping_mall_shipments.delete({
    where: { id: props.shipmentId },
  });
}
