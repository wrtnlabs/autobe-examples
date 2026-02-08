import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdministratorShipmentsShipmentIdTrackingsTrackingId(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify shipment existence
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: { id: true },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  // Verify shipment tracking existence under the shipment
  const tracking =
    await MyGlobal.prisma.shopping_mall_shipment_trackings.findFirst({
      where: {
        id: props.trackingId,
        shipment: {
          id: props.shipmentId,
        },
      },
      select: { id: true },
    });
  if (!tracking) {
    throw new HttpException("Shipment tracking not found", 404);
  }
  // Delete tracking record within transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_shipment_trackings.delete({
      where: { id: props.trackingId },
    });
  });
}
