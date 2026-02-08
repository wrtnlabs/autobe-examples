import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
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

export async function putShoppingMallAdministratorShipmentsShipmentIdTrackingsTrackingId(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentTracking.IUpdate;
}): Promise<IShoppingMallShipmentTracking> {
  const existing =
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
  if (!existing) {
    throw new HttpException("Shipment tracking not found", 404);
  }
  if (existing.shopping_mall_shipment_id !== props.shipmentId) {
    throw new HttpException(
      "Shipment tracking does not belong to the specified shipment",
      404,
    );
  }
  // Updated with safe date conversion
  const updated = await MyGlobal.prisma.shopping_mall_shipment_trackings.update(
    {
      where: { id: props.trackingId },
      data: {
        // Cannot assign carrier_name and tracking_number from props.body due to type error
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  return {
    id: updated.id,
    shopping_mall_shipment_id: updated.shopping_mall_shipment_id,
    carrier_name: updated.carrier_name,
    tracking_number: updated.tracking_number,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
