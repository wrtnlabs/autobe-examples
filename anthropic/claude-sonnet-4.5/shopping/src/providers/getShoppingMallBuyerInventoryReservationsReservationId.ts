import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function getShoppingMallBuyerInventoryReservationsReservationId(props: {
  buyer: BuyerPayload;
  reservationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryReservation> {
  const reservation =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.findUnique({
      where: { id: props.reservationId },
    });

  if (!reservation) {
    throw new HttpException("Inventory reservation not found", 404);
  }

  if (reservation.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: reservation.id,
    shopping_mall_sale_sku_id: reservation.shopping_mall_sale_sku_id,
    shopping_mall_buyer_id: reservation.shopping_mall_buyer_id,
    shopping_mall_order_id: reservation.shopping_mall_order_id ?? null,
    reserved_quantity: reservation.reserved_quantity,
    reservation_status: typia.assert<
      "active" | "expired" | "released" | "converted"
    >(reservation.reservation_status),
    expires_at: toISOStringSafe(reservation.expires_at),
    created_at: toISOStringSafe(reservation.created_at),
    updated_at: toISOStringSafe(reservation.updated_at),
  };
}
