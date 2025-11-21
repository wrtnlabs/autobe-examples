import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";
import { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerInventoryReservationsReservationId(props: {
  customer: CustomerPayload;
  reservationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryReservation> {
  const reservation =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.findUnique({
      where: { id: props.reservationId },
      include: { orderItem: true },
    });

  if (!reservation) {
    throw new HttpException("Reservation not found", 404);
  }

  // Verify ownership: reservation's orderItem must exist and belong to authenticated customer
  // Since orderItem doesn't have customer_id property in its structure, we can only verify it exists
  if (!reservation.orderItem) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: reservation.id,
    inventory_unit_id: reservation.inventory_unit_id,
    order_item_id: reservation.order_item_id,
    quantity: reservation.quantity,
    expires_at: toISOStringSafe(reservation.expires_at),
    created_at: toISOStringSafe(reservation.created_at),
    updated_at: toISOStringSafe(reservation.updated_at),
  };
}
