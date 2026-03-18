import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
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

export async function putShoppingMallMemberWishlistsWishlistId(props: {
  member: MemberPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlist.IUpdate;
}): Promise<IShoppingMallWishlist> {
  const existing =
    await MyGlobal.prisma.shopping_mall_wishlists.findUniqueOrThrow({
      where: { id: props.wishlistId },
      select: {
        id: true,
        shopping_mall_member_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (existing.shopping_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_wishlists.update({
    where: { id: props.wishlistId },
    data: {
      ...(props.body.deleted_at !== undefined
        ? { deleted_at: props.body.deleted_at }
        : {}),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_wishlists.findUniqueOrThrow({
      where: { id: props.wishlistId },
      select: {
        id: true,
        shopping_mall_member_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: updated.id,
    shoppingMallMemberId: updated.shopping_mall_member_id,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
