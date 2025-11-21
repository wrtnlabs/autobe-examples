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

export async function putShoppingMallCustomerInventoryReservationsReservationId(props: {
  customer: CustomerPayload;
  reservationId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryReservation.IUpdate;
}): Promise<IShoppingMallInventoryReservation> {
  const reservation =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.findUnique({
      where: { id: props.reservationId },
      include: { orderItem: { include: { order: true } } },
    });

  if (!reservation) {
    throw new HttpException("Reservation not found", 404);
  }

  // Verify ownership: reservation must be tied to an order belonging to this customer
  if (
    !reservation.orderItem ||
    !reservation.orderItem.order ||
    reservation.orderItem.order.shopping_mall_customer_id !== props.customer.id
  ) {
    throw new HttpException(
      "Forbidden: Reservation does not belong to this customer",
      403,
    );
  }

  // Check if reservation has expired - compare ISO string directly
  const now = toISOStringSafe(new Date());
  if (toISOStringSafe(reservation.expires_at) <= now) {
    throw new HttpException("Reservation has expired", 400);
  }

  // Validate new quantity does not exceed available inventory
  const inventory =
    await MyGlobal.prisma.shopping_mall_inventory_units.findUnique({
      where: { id: reservation.inventory_unit_id },
    });

  if (!inventory) {
    throw new HttpException("Inventory unit not found", 404);
  }

  const available = inventory.quantity;
  const currentReserved = reservation.quantity;
  const newQuantity = props.body.quantity;

  // Calculate net change: if increasing, we need additional stock
  const additionalNeeded = newQuantity - currentReserved;
  if (additionalNeeded > 0 && available < additionalNeeded) {
    throw new HttpException("Insufficient inventory", 400);
  }

  // Update reservation quantity
  const updated =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.update({
      where: { id: props.reservationId },
      data: {
        quantity: newQuantity,
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
