import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, cartId, itemId } = props;

  // Verify cart exists and belongs to authenticated customer
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: cartId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });

  if (!cart) {
    throw new HttpException("Cart not found or access denied", 404);
  }

  // Fetch cart item to validate existence and get SKU info
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: itemId,
      shopping_mall_cart_id: cartId,
    },
  });

  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }

  // Extract quantity for inventory restoration
  const quantityToRelease = cartItem.quantity;
  const skuId = cartItem.shopping_mall_sku_id;

  // Delete the cart item (hard delete)
  await MyGlobal.prisma.shopping_mall_cart_items.delete({
    where: {
      id: itemId,
    },
  });

  // Update SKU inventory: release reservation
  const updatedSku = await MyGlobal.prisma.shopping_mall_skus.update({
    where: {
      id: skuId,
    },
    data: {
      reserved_quantity: {
        decrement: quantityToRelease,
      },
      available_quantity: {
        increment: quantityToRelease,
      },
    },
  });

  // Create inventory transaction record
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_inventory_transactions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_sku_id: skuId,
      shopping_mall_order_id: null,
      actor_seller_id: null,
      actor_admin_id: null,
      transaction_type: "reservation_release",
      quantity_change: quantityToRelease,
      quantity_after: updatedSku.available_quantity,
      transaction_status: "completed",
      reason: "Cart item removed by customer",
      notes: null,
      created_at: now,
    },
  });

  // Update cart's updated_at timestamp
  await MyGlobal.prisma.shopping_mall_carts.update({
    where: {
      id: cartId,
    },
    data: {
      updated_at: now,
    },
  });
}
