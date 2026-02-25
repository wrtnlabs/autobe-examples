import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartItemTransformer } from "../transformers/ShoppingMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  // Step 1: Verify variant exists and get product/seller info for validation
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
      where: { id: props.body.variantId, deleted_at: null },
      select: {
        id: true,
        price: true,
        product: {
          select: {
            id: true,
            base_price: true,
            deleted_at: true,
            seller: {
              select: {
                id: true,
                approval_status: true,
              },
            },
          },
        },
      },
    });
  // Step 2: Business validation - product not deleted, seller not suspended
  if (variant.product.deleted_at !== null) {
    throw new HttpException("Product is no longer available", 410);
  }
  if (variant.product.seller.approval_status === "suspended") {
    throw new HttpException("Seller is currently suspended", 403);
  }
  // Step 3: Check for existing cart item (unique constraint on customer+variant)
  const existingItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
      where: {
        shopping_customer_id_shopping_product_variant_id: {
          shopping_customer_id: props.customer.id,
          shopping_product_variant_id: props.body.variantId,
        },
      },
      select: {
        id: true,
        quantity: true,
        unit_price: true,
      },
    });
  let cartItem: Prisma.shopping_mall_cart_itemsGetPayload<
    ReturnType<typeof ShoppingMallCartItemTransformer.select>
  >;
  if (existingItem) {
    // Step 4a: Update existing item - combine quantities, cap at 99
    const newQuantity = Math.min(
      existingItem.quantity + props.body.quantity,
      99,
    );
    cartItem = await MyGlobal.prisma.shopping_mall_cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: newQuantity,
        updated_at: new Date(),
      },
      ...ShoppingMallCartItemTransformer.select(),
    });
  } else {
    // Step 4b: Check 50-item limit for new items
    const currentCount = await MyGlobal.prisma.shopping_mall_cart_items.count({
      where: { shopping_customer_id: props.customer.id },
    });
    if (currentCount >= 50) {
      throw new HttpException(
        "Cart cannot contain more than 50 different items",
        400,
      );
    }
    // Calculate unit price for new cart item
    const unitPrice = variant.price ?? variant.product.base_price;
    // Step 5: Create new cart item
    const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
      data: {
        id: v4(),
        shopping_customer_id: props.customer.id,
        shopping_product_variant_id: props.body.variantId,
        quantity: props.body.quantity,
        unit_price: unitPrice,
        created_at: new Date(),
        updated_at: new Date(),
      },
      ...ShoppingMallCartItemTransformer.select(),
    });
    cartItem = created;
  }
  // Step 6: Return using transformer
  return await ShoppingMallCartItemTransformer.transform(cartItem);
}
