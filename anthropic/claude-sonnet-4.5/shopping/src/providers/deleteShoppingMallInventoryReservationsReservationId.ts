import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

export async function deleteShoppingMallInventoryReservationsReservationId(props: {
  reservationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryReservation> {
  const existing =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.findUnique({
      where: { id: props.reservationId },
    });

  if (!existing) {
    throw new HttpException("Inventory reservation not found", 404);
  }

  const deleted =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.delete({
      where: { id: props.reservationId },
    });

  return {
    id: deleted.id,
    shopping_mall_sale_sku_id: deleted.shopping_mall_sale_sku_id,
    shopping_mall_buyer_id: deleted.shopping_mall_buyer_id,
    shopping_mall_order_id:
      deleted.shopping_mall_order_id === null
        ? undefined
        : deleted.shopping_mall_order_id,
    reserved_quantity: deleted.reserved_quantity,
    reservation_status: typia.assert<
      "active" | "expired" | "released" | "converted"
    >(deleted.reservation_status),
    expires_at: toISOStringSafe(deleted.expires_at),
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
  };
}
