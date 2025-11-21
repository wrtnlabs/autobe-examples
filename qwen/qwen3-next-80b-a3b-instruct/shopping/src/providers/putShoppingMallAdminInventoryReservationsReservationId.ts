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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminInventoryReservationsReservationId(props: {
  admin: AdminPayload;
  reservationId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryReservation.IUpdate;
}): Promise<IShoppingMallInventoryReservation> {
  // Fetch the existing reservation
  const reservation =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.findUnique({
      where: { id: props.reservationId },
    });

  // Verify reservation exists
  if (!reservation) {
    throw new HttpException("Reservation not found", 404);
  }

  // Validate new quantity against available inventory
  const inventoryUnit =
    await MyGlobal.prisma.shopping_mall_inventory_units.findUnique({
      where: { id: reservation.inventory_unit_id },
    });

  if (!inventoryUnit) {
    throw new HttpException("Associated inventory unit not found", 404);
  }

  // Check if new quantity exceeds available stock
  if (props.body.quantity > inventoryUnit.quantity) {
    throw new HttpException("Insufficient inventory available", 400);
  }

  // Update only the quantity field
  const updated =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.update({
      where: { id: props.reservationId },
      data: {
        quantity: props.body.quantity,
      },
    });

  // Return updated reservation with proper date formatting
  return {
    id: updated.id,
    inventory_unit_id: updated.inventory_unit_id,
    order_item_id: updated.order_item_id,
    quantity: updated.quantity,
    expires_at: toISOStringSafe(updated.expires_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
