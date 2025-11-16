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

export async function putShoppingMallAdminShoppingMallShipmentsShoppingMallShipmentId(props: {
  admin: AdminPayload;
  shoppingMallShipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  const existing = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shoppingMallShipmentId },
  });

  if (!existing) {
    throw new HttpException("Shipment record not found", 404);
  }

  const isDate = (value: unknown): value is Date =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as Date).toISOString === "function";

  // Prepare update data
  const data = {
    shipping_method:
      props.body.shippingMethod === undefined
        ? (existing.shipping_method ?? undefined)
        : (props.body.shippingMethod ?? undefined),
    tracking_number:
      props.body.trackingNumber === undefined
        ? (existing.tracking_number ?? undefined)
        : (props.body.trackingNumber ?? undefined),
    status:
      props.body.status === undefined
        ? (existing.status ?? undefined)
        : (props.body.status ?? undefined),
    deleted_at:
      props.body.deletedAt === undefined
        ? existing.deleted_at
          ? toISOStringSafe(existing.deleted_at)
          : null
        : isDate(props.body.deletedAt)
          ? toISOStringSafe(props.body.deletedAt)
          : (props.body.deletedAt ?? null),
    updated_at: toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">,
  };

  const updated = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shoppingMallShipmentId },
    data: data,
  });

  return {
    id: updated.id,
    shoppingMallOrderId: updated.shopping_mall_order_id,
    shippingMethod: updated.shipping_method,
    trackingNumber: updated.tracking_number,
    status: updated.status,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
