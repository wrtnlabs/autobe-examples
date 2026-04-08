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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCartItemTransformer } from "../transformers/ShoppingMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberCartItemsCartItemId(props: {
  member: MemberPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  // Verify cart item exists and belongs to the authenticated member
  const cartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      select: {
        id: true,
        cart: {
          select: {
            member_id: true,
          },
        },
      },
    });
  // Verify ownership
  if (cartItem.cart.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Update quantity if provided
  if (props.body.quantity !== undefined) {
    await MyGlobal.prisma.shopping_mall_cart_items.update({
      where: { id: props.cartItemId },
      data: {
        quantity: props.body.quantity,
        updated_at: new Date(),
      },
    });
  }
  // Fetch updated cart item with all relations
  const updated =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      ...ShoppingMallCartItemTransformer.select(),
    });
  return await ShoppingMallCartItemTransformer.transform(updated);
}
