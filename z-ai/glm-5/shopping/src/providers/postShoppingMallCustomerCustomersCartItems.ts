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

export async function postShoppingMallCustomerCustomersCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  // Validate variant exists and is available
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.body.variantId,
        deleted_at: null,
        product: {
          deleted_at: null,
          seller: {
            approval_status: "approved",
            suspended: false,
            banned: false,
          },
        },
      },
      select: {
        id: true,
      },
    });
  if (!variant) {
    throw new HttpException("Variant not found or unavailable", 404);
  }
  // Get or create cart
  let cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { shopping_mall_customer_id: props.customer.id },
  });
  const now = new Date();
  if (!cart) {
    cart = await MyGlobal.prisma.shopping_mall_carts.create({
      data: {
        id: v4(),
        shopping_mall_customer_id: props.customer.id,
        created_at: now,
        updated_at: now,
      },
    });
  }
  // Upsert cart item (atomic increment for existing items)
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.upsert({
    where: {
      shopping_mall_cart_id_shopping_mall_product_variant_id: {
        shopping_mall_cart_id: cart.id,
        shopping_mall_product_variant_id: props.body.variantId,
      },
    },
    create: {
      id: v4(),
      shopping_mall_cart_id: cart.id,
      shopping_mall_product_variant_id: props.body.variantId,
      quantity: props.body.quantity,
      unavailable: false,
      created_at: now,
      updated_at: now,
    },
    update: {
      quantity: { increment: props.body.quantity },
      updated_at: now,
    },
  });
  // Return with variant info using transformer
  const result =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: cartItem.id },
      ...ShoppingMallCartItemTransformer.select(),
    });
  return await ShoppingMallCartItemTransformer.transform(result);
}
