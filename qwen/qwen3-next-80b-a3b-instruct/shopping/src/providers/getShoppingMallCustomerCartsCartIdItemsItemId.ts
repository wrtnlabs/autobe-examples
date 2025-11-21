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

export async function getShoppingMallCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string;
  itemId: string;
}): Promise<IShoppingMallCartItem> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: {
      id: props.cartId,
      shopping_mall_customer_id: props.customer.id,
      status: "active",
      deleted_at: null,
    },
  });

  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }

  const item = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: {
      id: props.itemId,
      shopping_mall_cart_id: props.cartId,
    },
  });

  if (!item) {
    throw new HttpException("Cart item not found", 404);
  }

  return {
    price: item.price,
  };
}
