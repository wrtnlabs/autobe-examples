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

export async function deleteShoppingMallMemberCartsCartId(props: {
  member: MemberPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_carts.findFirstOrThrow({
    where: {
      id: props.cartId,
      shopping_mall_member_id: props.member.id,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_carts.updateMany({
      where: {
        id: props.cartId,
        shopping_mall_member_id: props.member.id,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        updated_at: now,
        warning_inventory_insufficient: false,
      },
    });
    await tx.shopping_mall_cart_items.updateMany({
      where: {
        shopping_mall_cart_id: props.cartId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  });
}
