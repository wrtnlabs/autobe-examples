import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerShipmentTrackingsId(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentTracking.IUpdate;
}): Promise<IShoppingMallShipmentTracking> {
  const { seller, id, body } = props;

  // Verify existence
  const existing =
    await MyGlobal.prisma.shopping_mall_shipment_trackings.findUnique({
      where: { id },
    });
  if (!existing) {
    throw new HttpException(
      `Shipment tracking record with id ${id} not found`,
      404,
    );
  }

  // Update fields
  const updated = await MyGlobal.prisma.shopping_mall_shipment_trackings.update(
    {
      where: { id },
      data: {
        tracking_number: body.tracking_number,
        carrier_name: body.carrier_name,
        shipping_status: body.shipping_status,
        shipped_at: toISOStringSafe(body.shipped_at),
        delivered_at:
          body.delivered_at === null || body.delivered_at === undefined
            ? undefined
            : toISOStringSafe(body.delivered_at),
        updated_at: toISOStringSafe(new Date()),
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
    delivered_at: updated.delivered_at
      ? toISOStringSafe(updated.delivered_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
