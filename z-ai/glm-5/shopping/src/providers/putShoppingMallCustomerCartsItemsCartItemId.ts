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

export async function putShoppingMallCustomerCartsItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  // 1. Find cart item with cart to verify ownership
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: { id: props.cartItemId },
    select: {
      id: true,
      shopping_mall_cart_id: true,
      unavailable: true,
      cart: {
        select: {
          shopping_mall_customer_id: true,
        },
      },
    },
  });
  if (cartItem === null) {
    throw new HttpException("Cart item not found", 404);
  }
  // 2. Verify cart ownership (404 to avoid enumeration)
  if (cartItem.cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Cart item not found", 404);
  }
  // 3. Check if item is unavailable
  if (cartItem.unavailable) {
    throw new HttpException("Cannot update unavailable cart item", 400);
  }
  // 4. Update cart item quantity
  const updatedItem = await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: { id: props.cartItemId },
    data: {
      ...(props.body.quantity !== undefined && {
        quantity: props.body.quantity,
      }),
      updated_at: new Date(),
    },
    ...ShoppingMallCartItemTransformer.select(),
  });
  // 5. Update cart's updated_at timestamp
  await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: cartItem.shopping_mall_cart_id },
    data: { updated_at: new Date() },
  });
  // 6. Return transformed cart item
  return await ShoppingMallCartItemTransformer.transform(updatedItem);
}
