import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCartValidation(props: {
  customer: CustomerPayload;
}): Promise<void> {
  // Fetch all cart items for the customer with related data
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: {
      user_id: props.customer.id,
    },
    select: {
      id: true,
      user_id: true,
      variant_id: true,
      quantity: true,
      created_at: true,
      updated_at: true,
      variant: {
        select: {
          id: true,
          product_id: true,
          stock_quantity: true,
          deleted_at: true,
          product: {
            select: {
              id: true,
              seller_id: true,
              is_available: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  });
  // Validate each cart item
  const warnings: string[] = [];
  const unavailableItems: {
    cart_item_id: string & tags.Format<"uuid">;
    reason: string;
  }[] = [];
  for (const cartItem of cartItems) {
    // Check if variant is available and in stock
    if (!cartItem.variant) {
      unavailableItems.push({
        cart_item_id: cartItem.id as string & tags.Format<"uuid">,
        reason: "Product variant not found",
      });
      continue;
    }
    if (cartItem.variant.deleted_at !== null) {
      unavailableItems.push({
        cart_item_id: cartItem.id as string & tags.Format<"uuid">,
        reason: "Product variant has been deleted",
      });
      continue;
    }
    // Check stock quantity
    if (cartItem.variant.stock_quantity < cartItem.quantity) {
      warnings.push(
        `Cart item ${cartItem.id}: Insufficient stock. Available: ${cartItem.variant.stock_quantity}, Requested: ${cartItem.quantity}`,
      );
    }
    // Check if product is available
    if (!cartItem.variant.product) {
      unavailableItems.push({
        cart_item_id: cartItem.id as string & tags.Format<"uuid">,
        reason: "Product not found",
      });
      continue;
    }
    if (cartItem.variant.product.deleted_at !== null) {
      unavailableItems.push({
        cart_item_id: cartItem.id as string & tags.Format<"uuid">,
        reason: "Product has been deleted",
      });
      continue;
    }
    if (!cartItem.variant.product.is_available) {
      unavailableItems.push({
        cart_item_id: cartItem.id as string & tags.Format<"uuid">,
        reason: "Product is not available",
      });
    }
  }
  // If there are unavailable items, throw an exception with validation details
  if (unavailableItems.length > 0) {
    throw new HttpException(
      {
        message: "Cart validation failed",
        unavailableItems,
        warnings,
      },
      400,
    );
  }
  // Validation passed (no return value required for void)
  return;
}
