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
import { ShoppingMallCartItemCollector } from "../collectors/ShoppingMallCartItemCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCartItemTransformer } from "../transformers/ShoppingMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberCartItems(props: {
  member: MemberPayload;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  // Validate product variant exists
  await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
    where: { id: props.body.product_variant_id },
  });
  // Get or create the member's cart
  let cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!cart) {
    cart = await MyGlobal.prisma.shopping_mall_carts.create({
      data: {
        id: v4(),
        member_id: props.member.id,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });
  }
  // Check if cart item already exists for this variant
  const existingItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst(
    {
      where: {
        shopping_mall_cart_id: cart.id,
        shopping_mall_product_variant_id: props.body.product_variant_id,
      },
    },
  );
  let cartItem: Prisma.shopping_mall_cart_itemsGetPayload<
    ReturnType<typeof ShoppingMallCartItemTransformer.select>
  >;
  if (existingItem) {
    // Update: add new quantity to existing quantity
    await MyGlobal.prisma.shopping_mall_cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + props.body.quantity,
        updated_at: toISOStringSafe(new Date()),
      },
    });
    // Fetch updated item with transformer select
    cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow(
      {
        where: { id: existingItem.id },
        ...ShoppingMallCartItemTransformer.select(),
      },
    );
  } else {
    // Create: use collector for new cart item
    cartItem = await MyGlobal.prisma.shopping_mall_cart_items.create({
      data: await ShoppingMallCartItemCollector.collect({
        body: props.body,
        shoppingMallCarts: { id: cart.id },
      }),
      ...ShoppingMallCartItemTransformer.select(),
    });
  }
  return await ShoppingMallCartItemTransformer.transform(cartItem);
}
