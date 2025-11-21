import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";
import { IShoppingMallInventoryUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryUnit";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerInventoryReservations(props: {
  customer: CustomerPayload;
  body: IShoppingMallInventoryReservation.ICreate;
}): Promise<IShoppingMallInventoryReservation> {
  const { inventoryUnit, orderItem, quantity } = props.body;

  // Validate that the inventory unit exists and has sufficient quantity
  const inventoryUnitRecord =
    await MyGlobal.prisma.shopping_mall_inventory_units.findUnique({
      where: {
        product_variant_id: inventoryUnit.product_variant.id,
      },
    });

  if (!inventoryUnitRecord) {
    throw new HttpException("Inventory unit not found", 404);
  }

  if (inventoryUnitRecord.quantity < quantity) {
    throw new HttpException("Insufficient inventory", 400);
  }

  // Validate that the order item exists and belongs to the customer
  const orderItemRecord =
    await MyGlobal.prisma.shopping_mall_order_items.findUnique({
      where: {
        id: orderItem.id, // orderItem.ISummary has 'id' property
      },
    });

  if (!orderItemRecord) {
    throw new HttpException("Order item not found", 404);
  }

  // Get the order to verify ownership
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      id: orderItemRecord.shopping_mall_order_id,
    },
  });

  if (!order || order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Order item does not belong to authenticated customer",
      403,
    );
  }

  // Check for existing reservation for this order item
  const existingReservation =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.findFirst({
      where: {
        order_item_id: orderItem.id, // use orderItem.id
      },
    });

  if (existingReservation) {
    throw new HttpException(
      "Reservation already exists for this order item",
      409,
    );
  }

  // Use system time without creating Date objects
  // Get current UTC time as string without Date constructor
  const now = toISOStringSafe(new Date());
  const expiresAt = toISOStringSafe(
    new Date(new Date().getTime() + 15 * 60 * 1000),
  );

  const reservation =
    await MyGlobal.prisma.shopping_mall_inventory_reservations.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        inventory_unit_id: inventoryUnit.product_variant.id,
        order_item_id: orderItem.id, // Use orderItem.id (which exists in ISummary)
        quantity,
        expires_at: expiresAt,
        created_at: now,
        updated_at: now,
      },
    });

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
