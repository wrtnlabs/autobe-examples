import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, cartId } = props;

  // Authorization: Verify cart ownership and existence
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: cartId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });

  if (!cart) {
    throw new HttpException(
      "Cart not found or you do not have permission to access it",
      404,
    );
  }

  // Retrieve all cart items to process inventory releases
  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: {
      shopping_mall_cart_id: cartId,
    },
  });

  // Prepare timestamp for all operations
  const now = toISOStringSafe(new Date());

  // Process inventory releases for each cart item
  for (const item of cartItems) {
    // Get current SKU inventory state
    const sku = await MyGlobal.prisma.shopping_mall_skus.findUniqueOrThrow({
      where: {
        id: item.shopping_mall_sku_id,
      },
    });

    // Calculate new inventory quantities after release
    const newAvailableQuantity = sku.available_quantity + item.quantity;
    const newReservedQuantity = sku.reserved_quantity - item.quantity;

    // Update SKU inventory atomically
    await MyGlobal.prisma.shopping_mall_skus.update({
      where: {
        id: sku.id,
      },
      data: {
        available_quantity: newAvailableQuantity,
        reserved_quantity: newReservedQuantity,
        updated_at: now,
      },
    });

    // Create inventory transaction audit record
    await MyGlobal.prisma.shopping_mall_inventory_transactions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_sku_id: sku.id,
        shopping_mall_order_id: null,
        actor_seller_id: null,
        actor_admin_id: null,
        transaction_type: "reservation_release",
        quantity_change: item.quantity,
        quantity_after: newAvailableQuantity,
        transaction_status: "completed",
        reason: "Cart cleared by customer",
        notes: `Released ${item.quantity} units from cart ${cartId}`,
        created_at: now,
      },
    });
  }

  // Delete all cart items permanently
  await MyGlobal.prisma.shopping_mall_cart_items.deleteMany({
    where: {
      shopping_mall_cart_id: cartId,
    },
  });

  // Soft-delete the cart record
  await MyGlobal.prisma.shopping_mall_carts.update({
    where: {
      id: cartId,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
