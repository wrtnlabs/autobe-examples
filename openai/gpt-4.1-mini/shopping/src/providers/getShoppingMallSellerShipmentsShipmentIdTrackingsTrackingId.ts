import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerShipmentsShipmentIdTrackingsTrackingId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentTracking> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: { id: true, seller_id: true },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const tracking =
    await MyGlobal.prisma.shopping_mall_shipment_trackings.findUnique({
      where: { id: props.trackingId },
      select: {
        id: true,
        shopping_mall_shipment_id: true,
        carrier_name: true,
        tracking_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!tracking) {
    throw new HttpException("Tracking record not found", 404);
  }
  if (tracking.shopping_mall_shipment_id !== props.shipmentId) {
    throw new HttpException("Tracking record not found for this shipment", 404);
  }
  const shippedAt = toISOStringSafe(tracking.created_at) as unknown as string &
    tags.Format<"date-time">;
  // delivered_at field does not exist, so we set it to null
  const deliveredAt = null;
  const deletedAt = tracking.deleted_at
    ? (toISOStringSafe(tracking.deleted_at) as unknown as string &
        tags.Format<"date-time">)
    : null;
  return {
    carrier_name: tracking.carrier_name,
    tracking_code: tracking.tracking_number,
    shipped_at: shippedAt,
    delivered_at: deliveredAt,
    deleted_at: deletedAt,
  };
}
