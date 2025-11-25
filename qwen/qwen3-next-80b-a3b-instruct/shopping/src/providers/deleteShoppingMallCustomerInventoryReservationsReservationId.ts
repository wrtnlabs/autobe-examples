import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerInventoryReservationsReservationId(props: {
  customer: CustomerPayload;
  reservationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  await MyGlobal.prisma.$transaction(async (prisma) => {
    const reservation =
      await prisma.shopping_mall_inventory_reservations.findUnique({
        where: { id: props.reservationId },
        include: {
          orderItem: { include: { order: true } },
          inventoryUnit: true,
        },
      });

    if (!reservation) {
      throw new HttpException("Reservation not found", 404);
    }

    if (!reservation.orderItem?.order) {
      throw new HttpException(
        "Reservation not associated with valid order",
        403,
      );
    }

    if (
      reservation.orderItem.order.shopping_mall_customer_id !==
      props.customer.id
    ) {
      throw new HttpException(
        "Unauthorized: reservation does not belong to customer",
        403,
      );
    }

    // Release the reserved inventory quantity
    await prisma.shopping_mall_inventory_units.update({
      where: { id: reservation.inventory_unit_id },
      data: {
        quantity: { increment: reservation.quantity },
        last_updated: now,
      },
    });

    // Log the cancellation as an inventory transaction
    await prisma.shopping_mall_inventory_transactions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        inventory_unit_id: reservation.inventory_unit_id,
        type: "reservation_cancelled",
        quantity_change: reservation.quantity,
        quantity_after:
          (reservation.inventoryUnit?.quantity || 0) + reservation.quantity,
        source_adjustment_id: props.reservationId,
        created_at: now,
        seller_id: reservation.orderItem.order.shopping_mall_seller_id,
      },
    });

    // Delete the reservation record
    await prisma.shopping_mall_inventory_reservations.delete({
      where: { id: props.reservationId },
    });
  });
}
