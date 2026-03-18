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
  const now = (toISOStringSafe(new Date()) ?? "") satisfies string &
    tags.Format<"date-time">;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_wishlists.findFirstOrThrow({
      where: {
        id: props.wishlistId,
        shopping_mall_member_id: props.member.id,
      },
      select: { id: true },
    });
    await tx.shopping_mall_wishlist_items.updateMany({
      where: {
        id: props.wishlistItemId,
        shopping_mall_wishlist_id: props.wishlistId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  });
}
