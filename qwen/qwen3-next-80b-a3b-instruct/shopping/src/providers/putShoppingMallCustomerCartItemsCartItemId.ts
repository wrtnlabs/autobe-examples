import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IShoppingMallCartItem> {
  // Validate cart item exists and belongs to customer
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: {
      id: props.cartItemId,
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (!cartItem) {
    throw new HttpException("Cart item not found or access denied", 404);
  }
  // Get current stock quantity from inventory records for this product variant
  const inventoryRecords =
    await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
      where: {
        shopping_mall_product_variant_id:
          cartItem.shopping_mall_product_variant_id,
        // Only consider current stock (no deletions)
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      take: 1, // Most recent inventory record
    });
  // Calculate current available stock
  let currentStockQuantity = 0;
  if (inventoryRecords.length > 0) {
    const latestInventory = inventoryRecords[0];
    currentStockQuantity = latestInventory.quantity_change;
  }
  // Check if requested quantity exceeds available stock
  const requestedQuantity = props.body.quantity;
  const effectiveQuantity = Math.min(requestedQuantity, currentStockQuantity);
  // Update cart item with adjusted quantity
  const updatedCartItem = await MyGlobal.prisma.shopping_mall_cart_items.update(
    {
      where: { id: props.cartItemId },
      data: {
        quantity: effectiveQuantity,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  // Return the updated cart item with additional availability information
  return {
    shoppingMallProductId: updatedCartItem.shopping_mall_product_variant_id,
    quantity: updatedCartItem.quantity,
    priceAtTime: updatedCartItem.price_at_time,
    createdAt: updatedCartItem.created_at,
    updatedAt: updatedCartItem.updated_at,
  };
}
