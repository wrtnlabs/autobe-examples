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

export async function postShoppingMallSellerShipmentTrackings(props: {
  seller: SellerPayload;
  body: IShoppingMallShipmentTracking.ICreate;
}): Promise<IShoppingMallShipmentTracking> {
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;
  const created = await MyGlobal.prisma.shopping_mall_shipment_trackings.create(
    {
      data: {
        id,
        shopping_mall_order_id: props.body.shopping_mall_order_id,
        tracking_number: props.body.tracking_number,
        carrier_name: props.body.carrier_name,
        shipping_status: props.body.shipping_status,
        shipped_at: props.body.shipped_at,
        delivered_at: props.body.delivered_at ?? null,
        deleted_at: props.body.deleted_at ?? null,
        created_at: now,
        updated_at: now,
      },
    },
  );

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    tracking_number: created.tracking_number,
    carrier_name: created.carrier_name,
    shipping_status: created.shipping_status,
    shipped_at: toISOStringSafe(created.shipped_at),
    delivered_at: created.delivered_at
      ? toISOStringSafe(created.delivered_at)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
