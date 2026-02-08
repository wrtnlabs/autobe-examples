import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallSellerShipmentsShipmentIdTrackingsTrackingId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      seller_id: props.seller.id,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  const tracking =
    await MyGlobal.prisma.shopping_mall_shipment_trackings.findFirst({
      where: {
        id: props.trackingId,
        shipment: {
          id: props.shipmentId,
        },
      },
    });
  if (!tracking) {
    throw new HttpException("Tracking not found", 404);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_shipment_trackings.delete({
      where: { id: props.trackingId },
    });
  });
}
