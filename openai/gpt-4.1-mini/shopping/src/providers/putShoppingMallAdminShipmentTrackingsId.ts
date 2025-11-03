import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShipmentTrackingsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentTracking.IUpdate;
}): Promise<IShoppingMallShipmentTracking> {
  const { id, body } = props;

  const existing =
    await MyGlobal.prisma.shopping_mall_shipment_trackings.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        shopping_mall_order_id: true,
        tracking_number: true,
        carrier_name: true,
        shipping_status: true,
        shipped_at: true,
        delivered_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_shipment_trackings.update(
    {
      where: { id },
      data: {
        tracking_number: body.tracking_number,
        carrier_name: body.carrier_name,
        shipping_status: body.shipping_status,
        shipped_at: body.shipped_at,
        delivered_at:
          body.delivered_at === undefined ? null : body.delivered_at,
        updated_at: now,
      },
    },
  );

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    tracking_number: updated.tracking_number,
    carrier_name: updated.carrier_name,
    shipping_status: updated.shipping_status,
    shipped_at: toISOStringSafe(updated.shipped_at),
    delivered_at:
      updated.delivered_at === null
        ? null
        : updated.delivered_at === undefined
          ? undefined
          : toISOStringSafe(updated.delivered_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? null
        : updated.deleted_at === undefined
          ? undefined
          : toISOStringSafe(updated.deleted_at),
  };
}
