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

export async function deleteShoppingMallMemberWishlistItemsWishlistItemId(props: {
  member: MemberPayload;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: { id: props.wishlistItemId },
      select: {
        id: true,
        shopping_mall_member_id: true,
        deleted_at: true,
      },
    });
  if (wishlistItem === null) {
    throw new HttpException("Not Found", 404);
  }
  if (wishlistItem.shopping_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (wishlistItem.deleted_at !== null) {
    throw new HttpException("Bad Request", 400);
  }
  await MyGlobal.prisma.shopping_mall_wishlist_items.update({
    where: { id: props.wishlistItemId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
