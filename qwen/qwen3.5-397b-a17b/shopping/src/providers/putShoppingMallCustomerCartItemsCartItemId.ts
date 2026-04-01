import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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

export async function putShoppingMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: { id: props.cartItemId },
    ...ShoppingMallCartItemTransformer.select(),
  });
  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }
  if (cartItem.cart.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (cartItem.deleted_at !== null) {
    throw new HttpException("Cart item already removed", 400);
  }
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: cartItem.productVariant.id },
    });
  if (!variant) {
    throw new HttpException("Product variant no longer available", 400);
  }
  if (props.body.quantity !== undefined && props.body.quantity < 0) {
    throw new HttpException("Quantity cannot be negative", 400);
  }
  const shouldRemove = props.body.remove === true || props.body.quantity === 0;
  if (shouldRemove) {
    await MyGlobal.prisma.shopping_mall_cart_items.update({
      where: { id: props.cartItemId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  } else if (props.body.quantity !== undefined && props.body.quantity >= 1) {
    await MyGlobal.prisma.shopping_mall_cart_items.update({
      where: { id: props.cartItemId },
      data: {
        quantity: props.body.quantity,
        updated_at: new Date(),
      },
    });
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      ...ShoppingMallCartItemTransformer.select(),
    });
  return await ShoppingMallCartItemTransformer.transform(updated);
}
