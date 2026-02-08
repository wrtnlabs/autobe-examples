import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function getShoppingMallAdministratorShipmentsShipmentId(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: {
      id: true,
      seller_id: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  // Authorization: Only administrators and the seller owning the shipment can access
  if (props.administrator.id !== shipment.seller_id) {
    // The user is an admin, no further seller check needed here
    // Because only admin or owner sellers allowed, but since this is admin endpoint, just admin check suffices
    // But requirement said seller owning shipment or admin, this is admin API, so admin can access all shipments
    // Authorization granted
  }
  return {
    id: shipment.id,
    seller_id: shipment.seller_id,
    status: shipment.status,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
    deleted_at:
      shipment.deleted_at === null
        ? null
        : toISOStringSafe(shipment.deleted_at),
  };
}
