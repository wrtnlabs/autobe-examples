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

export async function deleteShoppingMallMemberWishlistsWishlistIdItemsWishlistItemId(props: {
  member: MemberPayload;
  wishlistId: string & tags.Format<"uuid">;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = toISOStringSafe(new Date());
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
    select: { id: true, shopping_mall_member_id: true },
  });
  if (
    wishlist === null ||
    wishlist.shopping_mall_member_id !== props.member.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.shopping_mall_wishlist_items.findFirst({
      where: {
        id: props.wishlistItemId,
        shopping_mall_wishlist_id: props.wishlistId,
      },
      select: { id: true, deleted_at: true },
    });
    if (existing === null) {
      return;
    }
    if (existing.deleted_at !== null) {
      return;
    }
    await tx.shopping_mall_wishlist_items.update({
      where: { id: props.wishlistItemId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  });
}
