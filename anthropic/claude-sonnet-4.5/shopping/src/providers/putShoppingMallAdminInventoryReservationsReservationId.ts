import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminInventoryReservationsReservationId(props: {
  admin: AdminPayload;
  reservationId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryReservation.IUpdate;
}): Promise<IShoppingMallInventoryReservation> {
  const existing =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.findUnique({
      where: { id: props.reservationId },
    });

  if (!existing) {
    throw new HttpException("Inventory reservation not found", 404);
  }

  const updated =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.update({
      where: { id: props.reservationId },
      data: {
        ...(props.body.reserved_quantity !== undefined && {
          reserved_quantity: props.body.reserved_quantity,
        }),
        ...(props.body.reservation_status !== undefined && {
          reservation_status: props.body.reservation_status,
        }),
        ...(props.body.expires_at !== undefined && {
          expires_at: props.body.expires_at,
        }),
        ...(props.body.shopping_mall_order_id !== undefined && {
          shopping_mall_order_id: props.body.shopping_mall_order_id,
        }),
        updated_at: new Date(),
      },
    });

  return {
    id: updated.id,
    shopping_mall_sale_sku_id: updated.shopping_mall_sale_sku_id,
    shopping_mall_buyer_id: updated.shopping_mall_buyer_id,
    shopping_mall_order_id: updated.shopping_mall_order_id ?? undefined,
    reserved_quantity: updated.reserved_quantity,
    reservation_status: typia.assert<
      "active" | "expired" | "released" | "converted"
    >(updated.reservation_status),
    expires_at: toISOStringSafe(updated.expires_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
