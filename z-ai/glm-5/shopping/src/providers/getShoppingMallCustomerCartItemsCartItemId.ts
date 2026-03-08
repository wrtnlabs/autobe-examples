import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function getShoppingMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCartItem> {
  // Find customer's cart (one-to-one relationship)
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { shopping_mall_customer_id: props.customer.id },
  });
  // If customer has no cart, return 404
  if (!cart) {
    throw new HttpException("Cart item not found", 404);
  }
  // Find the specific cart item within customer's cart
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: props.cartItemId,
      shopping_mall_cart_id: cart.id,
    },
    ...ShoppingMallCartItemTransformer.select(),
  });
  // Return 404 if cart item not found (handles both not existing and wrong cart)
  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }
  // Transform and return using the transformer
  return await ShoppingMallCartItemTransformer.transform(cartItem);
}
