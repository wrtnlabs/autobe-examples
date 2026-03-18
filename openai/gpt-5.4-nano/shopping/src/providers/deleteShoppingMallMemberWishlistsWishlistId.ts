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

export async function deleteShoppingMallMemberWishlistsWishlistId(props: {
  member: MemberPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_wishlists.findFirstOrThrow({
      where: {
        id: props.wishlistId,
        shopping_mall_member_id: props.member.id,
      },
      select: { id: true },
    });
    await tx.shopping_mall_wishlists.delete({
      where: { id: props.wishlistId },
    });
  });
}
