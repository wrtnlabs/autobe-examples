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

export async function putShoppingMallCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCart.IUpdate;
}): Promise<IShoppingMallCart> {
  // Find the cart item
  const cartItem = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: props.cartId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!cartItem) {
    throw new HttpException("Cart item not found or unauthorized", 404);
  }
  // Update the cart item
  const updatedCart = await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: props.cartId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updatedCart.id,
    shopping_mall_customer_id: updatedCart.shopping_mall_customer_id,
    shopping_mall_product_variant_id:
      updatedCart.shopping_mall_product_variant_id,
    quantity: updatedCart.quantity,
    created_at: toISOStringSafe(updatedCart.created_at),
    updated_at: updatedCart.updated_at,
    deleted_at: updatedCart.deleted_at,
  };
}
