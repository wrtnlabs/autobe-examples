import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";
import { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function putShoppingMallInventoryReservationsReservationId(props: {
  reservationId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryReservation.IUpdate;
}): Promise<IShoppingMallInventoryReservation> {
  // Find reservation
  const reservation =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.findUnique({
      where: { id: props.reservationId },
    });

  if (!reservation) {
    throw new HttpException("Reservation not found", 404);
  }

  // Check if reservation is expired (string comparison with current ISO string)
  const now = toISOStringSafe(new Date());
  if (toISOStringSafe(reservation.expires_at) <= now) {
    throw new HttpException("Reservation has expired", 400);
  }

  // Get inventory unit to validate stock
  const inventoryUnit =
    await MyGlobal.prisma.shopping_mall_inventory_units.findUnique({
      where: { id: reservation.inventory_unit_id },
    });

  if (!inventoryUnit) {
    throw new HttpException("Inventory unit not found", 404);
  }

  // Validate new quantity doesn't exceed available inventory
  // Available = current inventory - other active reservations for same unit
  const otherReservations =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.aggregate({
      _sum: { quantity: true },
      where: {
        inventory_unit_id: reservation.inventory_unit_id,
        id: { not: props.reservationId },
        expires_at: { gt: now },
      },
    });

  const sumOfOtherQuantities = otherReservations._sum.quantity || 0;
  const availableInventory = inventoryUnit.quantity - sumOfOtherQuantities;

  if (props.body.quantity > availableInventory) {
    throw new HttpException("Insufficient inventory available", 400);
  }

  // Update reservation
  const updated =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.update({
      where: { id: props.reservationId },
      data: {
        quantity: props.body.quantity,
        updated_at: toISOStringSafe(new Date()),
      },
    });

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
