import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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

export async function getShoppingMallMemberCartsCartIdItemsCartItemId(props: {
  member: MemberPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCartItem> {
  await MyGlobal.prisma.shopping_mall_carts.findFirstOrThrow({
    where: {
      id: props.cartId,
      shopping_mall_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const cartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findFirstOrThrow({
      where: {
        id: props.cartItemId,
        shopping_mall_cart_id: props.cartId,
        deleted_at: null,
      },
      ...ShoppingMallCartItemTransformer.select(),
    });
  return await ShoppingMallCartItemTransformer.transform(cartItem);
}
