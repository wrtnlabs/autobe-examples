import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerInventoryReservationsReservationId(props: {
  seller: SellerPayload;
  reservationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryReservation> {
  const reservation =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.findUnique({
      where: {
        id: props.reservationId,
      },
      include: {
        sku: {
          include: {
            sale: true,
          },
        },
      },
    });

  if (!reservation) {
    throw new HttpException("Inventory reservation not found", 404);
  }

  if (reservation.sku.sale.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: reservation.id,
    shopping_mall_sale_sku_id: reservation.shopping_mall_sale_sku_id,
    shopping_mall_buyer_id: reservation.shopping_mall_buyer_id,
    shopping_mall_order_id:
      reservation.shopping_mall_order_id === null
        ? undefined
        : reservation.shopping_mall_order_id,
    reserved_quantity: reservation.reserved_quantity,
    reservation_status: reservation.reservation_status as
      | "active"
      | "released"
      | "expired"
      | "converted",
    expires_at: toISOStringSafe(reservation.expires_at),
    created_at: toISOStringSafe(reservation.created_at),
    updated_at: toISOStringSafe(reservation.updated_at),
  };
}
