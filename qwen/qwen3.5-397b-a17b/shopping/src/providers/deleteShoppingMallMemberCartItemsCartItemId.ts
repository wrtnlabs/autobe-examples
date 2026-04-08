import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallMemberCartItemsCartItemId(props: {
  member: MemberPayload;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const cartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      select: {
        id: true,
        cart: {
          select: { member_id: true },
        },
      },
    });
  if (cartItem.cart.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_cart_items.delete({
    where: { id: props.cartItemId },
  });
}
