import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  const { customer, cartId, itemId, body } = props;

  // Step 1: Validate cart exists and belongs to customer
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: cartId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });

  if (!cart) {
    throw new HttpException("Cart not found or does not belong to you", 404);
  }

  // Step 2: Validate cart item exists in this cart
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: itemId,
      shopping_mall_cart_id: cartId,
    },
  });

  if (!cartItem) {
    throw new HttpException("Cart item not found in this cart", 404);
  }

  // Step 3: Handle no quantity change
  if (body.quantity === undefined) {
    return {
      id: cartItem.id,
      quantity: Number(cartItem.quantity) as number & tags.Type<"int32">,
    };
  }

  const newQuantity = Number(body.quantity);
  const currentQuantity = Number(cartItem.quantity);

  // Early return if no change
  if (newQuantity === currentQuantity) {
    return {
      id: cartItem.id,
      quantity: Number(cartItem.quantity) as number & tags.Type<"int32">,
    };
  }

  const quantityDifference = newQuantity - currentQuantity;

  // Step 4: Handle removal (quantity = 0)
  if (newQuantity === 0) {
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Release all reserved inventory
      await tx.shopping_mall_skus.update({
        where: { id: cartItem.shopping_mall_sku_id },
        data: {
          available_quantity: { increment: currentQuantity },
          reserved_quantity: { decrement: currentQuantity },
          updated_at: toISOStringSafe(new Date()),
        },
      });

      // Remove cart item
      await tx.shopping_mall_cart_items.delete({
        where: { id: itemId },
      });
    });

    return {
      id: cartItem.id,
      quantity: 0 as number & tags.Type<"int32">,
    };
  }

  // Step 5: Validate quantity limits
  if (newQuantity < 0) {
    throw new HttpException("Quantity must be 0 or positive", 400);
  }

  if (newQuantity > 99) {
    throw new HttpException("Maximum quantity per item is 99", 400);
  }

  // Step 6: Validate SKU and inventory availability
  const sku = await MyGlobal.prisma.shopping_mall_skus.findFirst({
    where: {
      id: cartItem.shopping_mall_sku_id,
      is_active: true,
    },
    include: {
      product: {
        include: {
          seller: true,
        },
      },
    },
  });

  if (!sku) {
    throw new HttpException("Product SKU is no longer available", 404);
  }

  if (sku.product.status !== "active") {
    throw new HttpException("Product is no longer active", 400);
  }

  if (!sku.product.seller || sku.product.seller.account_status !== "active") {
    throw new HttpException("Seller is no longer active", 400);
  }

  // Step 7: Validate inventory availability for quantity increase
  if (quantityDifference > 0) {
    const availableQty = Number(sku.available_quantity);
    if (availableQty < quantityDifference) {
      throw new HttpException(
        `Insufficient inventory. Only ${availableQty} units available`,
        400,
      );
    }
  }

  // Step 8: Update inventory and cart item atomically
  const updatedItem = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update SKU inventory based on quantity change
    if (quantityDifference > 0) {
      // Increasing quantity - reserve more inventory
      await tx.shopping_mall_skus.update({
        where: { id: sku.id },
        data: {
          available_quantity: { decrement: quantityDifference },
          reserved_quantity: { increment: quantityDifference },
          updated_at: toISOStringSafe(new Date()),
        },
      });
    } else if (quantityDifference < 0) {
      // Decreasing quantity - release inventory
      const releaseQuantity = Math.abs(quantityDifference);
      await tx.shopping_mall_skus.update({
        where: { id: sku.id },
        data: {
          available_quantity: { increment: releaseQuantity },
          reserved_quantity: { decrement: releaseQuantity },
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }

    // Update cart item
    return await tx.shopping_mall_cart_items.update({
      where: { id: itemId },
      data: {
        quantity: newQuantity,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });

  // Step 9: Return updated cart item
  return {
    id: updatedItem.id,
    quantity: Number(updatedItem.quantity) as number & tags.Type<"int32">,
  };
}
