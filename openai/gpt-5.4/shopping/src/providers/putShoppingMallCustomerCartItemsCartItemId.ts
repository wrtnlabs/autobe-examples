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

export async function putShoppingMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  if (props.body.quantity === undefined || props.body.quantity < 1) {
    throw new HttpException("Invalid quantity", 400);
  }
  const cartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findFirstOrThrow({
      where: {
        id: props.cartItemId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        shopping_mall_product_id: true,
        shopping_mall_product_variant_id: true,
      },
    });
  if (cartItem.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: {
        id: cartItem.shopping_mall_product_variant_id,
      },
      select: {
        id: true,
        price: true,
        deleted_at: true,
      },
    });
  if (productVariant.deleted_at !== null) {
    throw new HttpException("Cart item is no longer available", 400);
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: cartItem.shopping_mall_product_id,
      },
      select: {
        id: true,
        base_price: true,
        status: true,
        deleted_at: true,
      },
    });
  if (product.deleted_at !== null || product.status !== "active") {
    throw new HttpException("Cart item is no longer available", 400);
  }
  await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: {
      id: props.cartItemId,
    },
    data: {
      quantity: props.body.quantity,
      unit_price: productVariant.price ?? product.base_price,
      availability: true,
      updated_at: new globalThis.Date(new globalThis.Date().toISOString()),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: {
        id: props.cartItemId,
      },
      ...ShoppingMallCartItemTransformer.select(),
    });
  return await ShoppingMallCartItemTransformer.transform(updated);
}
