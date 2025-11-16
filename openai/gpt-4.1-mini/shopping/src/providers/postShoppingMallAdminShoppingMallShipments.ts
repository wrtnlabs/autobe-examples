import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminShoppingMallShipments(props: {
  admin: AdminPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  const createdAt = toISOStringSafe(new Date());
  const updatedAt = createdAt;

  const created = await MyGlobal.prisma.shopping_mall_shipments.create({
    data: {
      id: v4(),
      shopping_mall_order_id: props.body.shoppingMallOrderId,
      shipping_method: props.body.shippingMethod,
      tracking_number: props.body.trackingNumber ?? null,
      status: props.body.status,
      created_at: createdAt,
      updated_at: updatedAt,
    },
  });

  return {
    id: created.id,
    shoppingMallOrderId: created.shopping_mall_order_id,
    shippingMethod: created.shipping_method,
    trackingNumber: created.tracking_number ?? null,
    status: created.status,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    deletedAt:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
