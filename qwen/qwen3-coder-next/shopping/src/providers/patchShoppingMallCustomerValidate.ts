import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
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

export async function patchShoppingMallCustomerValidate(props: {
  customer: CustomerPayload;
  body: IShoppingMallCart.IValidateRequest;
}): Promise<IShoppingMallCart.IValidationResult> {
  // 1. Retrieve customer's cart items with full product and variant data
  const cartItems = await MyGlobal.prisma.shopping_mall_carts.findMany({
    where: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    include: {
      variant: {
        include: {
          product: {
            include: {
              seller: {
                select: {
                  id: true,
                  shop_name: true,
                  status: true,
                },
              },
              subcategory: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });
  // 2. Initialize validation results arrays
  const errors: any[] = [];
  const warnings: any[] = [];
  let validItemsCount = 0;
  // 3. Process each cart item for validation
  for (const cartItem of cartItems) {
    const variant = cartItem.variant;
    const product = variant.product;
    const seller = product.seller;
    // 3.1. Validate product active status
    if (product.status === "deleted") {
      errors.push({
        type: "product_deleted",
        message: `Product "${product.name}" has been deleted`,
        cart_item_id: cartItem.id,
        product_id: product.id,
        variant_id: variant.id,
      });
      continue;
    }
    if (product.status !== "active") {
      errors.push({
        type: "product_inactive",
        message: `Product "${product.name}" is not available for purchase`,
        cart_item_id: cartItem.id,
        product_id: product.id,
        variant_id: variant.id,
      });
      continue;
    }
    // 3.2. Validate seller active status
    if (seller.status === "deleted" || seller.status === "rejected") {
      errors.push({
        type: "seller_inactive",
        message: `Seller "${seller.shop_name}" is no longer active`,
        cart_item_id: cartItem.id,
        seller_id: seller.id,
        product_id: product.id,
        variant_id: variant.id,
      });
      continue;
    }
    // 3.3. Check stock quantity availability
    if (variant.stock_quantity === 0) {
      errors.push({
        type: "out_of_stock",
        message: `Product "${product.name}" is out of stock`,
        cart_item_id: cartItem.id,
        variant_id: variant.id,
        requested_quantity: cartItem.quantity,
        available_quantity: variant.stock_quantity,
      });
      continue;
    }
    // 3.4. Check low stock warning
    if (variant.stock_quantity < cartItem.quantity) {
      errors.push({
        type: "insufficient_stock",
        message: `Only ${variant.stock_quantity} units available for "${product.name}", but ${cartItem.quantity} requested`,
        cart_item_id: cartItem.id,
        variant_id: variant.id,
        requested_quantity: cartItem.quantity,
        available_quantity: variant.stock_quantity,
      });
      continue;
    }
    // 3.5. Check low stock warning (between 1-10 units)
    if (
      variant.stock_quantity <= 10 &&
      variant.stock_quantity >= cartItem.quantity
    ) {
      warnings.push({
        type: "low_stock",
        message: `Only ${variant.stock_quantity} units of "${product.name}" remaining`,
        cart_item_id: cartItem.id,
        variant_id: variant.id,
        available_quantity: variant.stock_quantity,
      });
    }
    // 3.6. Validate variant active status
    if (!variant.is_active) {
      errors.push({
        type: "variant_inactive",
        message: `Selected variant of "${product.name}" is no longer available`,
        cart_item_id: cartItem.id,
        variant_id: variant.id,
        product_id: product.id,
      });
      continue;
    }
    // 3.7. Count valid items
    validItemsCount++;
  }
  // 4. Determine overall cart readiness status
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const isReadyForCheckout = !hasErrors && cartItems.length > 0;
  // 5. Build validation result
  const result: IShoppingMallCart.IValidationResult = {
    is_ready_for_checkout: isReadyForCheckout,
    total_items: cartItems.length,
    valid_items: validItemsCount,
    items_with_errors: errors.length,
    items_with_warnings: warnings.length,
    errors,
    warnings,
  };
  return result;
}
