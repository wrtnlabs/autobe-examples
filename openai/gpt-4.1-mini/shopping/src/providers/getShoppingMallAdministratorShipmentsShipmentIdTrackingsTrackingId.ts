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

export async function getShoppingMallAdministratorShipmentsShipmentIdTrackingsTrackingId(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentTracking> {
  const tracking =
    await MyGlobal.prisma.shopping_mall_shipment_trackings.findUnique({
      where: { id: props.trackingId },
    });
  if (!tracking || tracking.shopping_mall_shipment_id !== props.shipmentId) {
    throw new HttpException("Not found", 404);
  }
  return {
    id: tracking.id,
    shipment_id: tracking.shopping_mall_shipment_id,
    carrier_name: tracking.carrier_name,
    tracking_code: tracking.tracking_number,
    created_at: toISOStringSafe(tracking.created_at),
    updated_at: toISOStringSafe(tracking.updated_at),
    deleted_at:
      tracking.deleted_at === null
        ? null
        : toISOStringSafe(tracking.deleted_at),
  };
}
