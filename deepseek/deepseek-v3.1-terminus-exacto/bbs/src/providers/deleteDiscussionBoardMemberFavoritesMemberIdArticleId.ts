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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteDiscussionBoardMemberFavoritesMemberIdArticleId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify ownership - member can only delete their own favorites
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "Forbidden: You can only delete your own favorites",
      403,
    );
  }
  // 2. Verify member exists and is not banned/deleted
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: {
        id: props.memberId,
        deleted_at: null,
      },
      select: { id: true, is_banned: true },
    });
  if (member.is_banned) {
    throw new HttpException("Member is banned", 403);
  }
  // 3. Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 4. Find favorite record using composite unique constraint
  const favorite =
    await MyGlobal.prisma.discussion_board_article_favorites.findFirst({
      where: {
        discussion_board_member_id: props.memberId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!favorite) {
    // Already soft-deleted or never existed - return success (idempotent)
    return;
  }
  // 5. Soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_article_favorites.update({
    where: { id: favorite.id },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
