import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
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

export async function putShoppingMallCustomerItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const cartItem = await prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      select: {
        id: true,
        deleted_at: true,
        cart: {
          select: {
            id: true,
            shopping_mall_customer_id: true,
          },
        },
        productVariant: {
          select: {
            id: true,
            deleted_at: true,
            stock_quantity: true,
          },
        },
      },
    });
    if (cartItem.deleted_at !== null) throw new HttpException("Not Found", 404);
    if (cartItem.cart.shopping_mall_customer_id !== props.customer.id) {
      throw new HttpException("Not Found", 404);
    }
    if (cartItem.productVariant.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    if (cartItem.productVariant.stock_quantity < props.body.quantity) {
      throw new HttpException("Quantity exceeds stock", 400);
    }
    await prisma.shopping_mall_cart_items.update({
      where: { id: props.cartItemId },
      data: {
        quantity: props.body.quantity,
        updated_at: new Date(),
      },
    });
    return await prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      ...ShoppingMallCartItemTransformer.select(),
    });
  });
  return await ShoppingMallCartItemTransformer.transform(updated);
}
