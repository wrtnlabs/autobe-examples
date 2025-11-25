import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminInventoryReservationsReservationId(props: {
  admin: AdminPayload;
  reservationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = toISOStringSafe(new Date());

  const reservation =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.findUnique({
      where: { id: props.reservationId },
      include: {
        orderItem: { include: { order: { include: { seller: true } } } },
      },
    });

  if (!reservation) {
    throw new HttpException("Reservation not found", 404);
  }

  // Retrieve the current inventory unit for the reservation
  const inventoryUnit =
    await MyGlobal.prisma.shopping_mall_inventory_units.findUnique({
      where: { id: reservation.inventory_unit_id },
    });

  if (!inventoryUnit) {
    throw new HttpException("Inventory unit not found", 404);
  }

  // Use transaction to ensure atomicity
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Release reserved quantity back to inventory
    await prisma.shopping_mall_inventory_units.update({
      where: { id: reservation.inventory_unit_id },
      data: {
        quantity: {
          increment: reservation.quantity,
        },
        last_updated: now,
      },
    });

    // Create audit trail transaction
    await prisma.shopping_mall_inventory_transactions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        inventory_unit_id: reservation.inventory_unit_id,
        type: "released",
        quantity_change: reservation.quantity,
        quantity_after: inventoryUnit.quantity + reservation.quantity,
        source_order_item_id: reservation.order_item_id,
        seller_id: reservation.orderItem?.order?.seller?.id ?? undefined,
        created_at: now,
      },
    });

    // Delete the reservation
    await prisma.shopping_mall_inventory_reservations.delete({
      where: { id: props.reservationId },
    });
  });
}
