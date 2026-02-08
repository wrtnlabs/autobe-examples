import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function getShoppingMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  // Query shipment with seller relation
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: {
      id: true,
      seller_id: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      seller: {
        select: {
          id: true,
          // Add any seller summary fields expected by IShoppingMallShipment
        },
      },
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: shipment.id,
    seller_id: shipment.seller_id,
    status: shipment.status,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
    deleted_at: shipment.deleted_at
      ? toISOStringSafe(shipment.deleted_at)
      : null,
    seller: {
      id: shipment.seller.id,
    },
  };
}
