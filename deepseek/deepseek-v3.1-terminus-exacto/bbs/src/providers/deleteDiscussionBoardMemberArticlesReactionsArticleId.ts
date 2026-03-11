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

export async function deleteDiscussionBoardMemberArticlesReactionsArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify article exists (auto 404 if not found)
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Delete the member's reaction(s) on this article
  const deleted =
    await MyGlobal.prisma.discussion_board_article_reactions.deleteMany({
      where: {
        discussion_board_article_id: props.articleId,
        discussion_board_member_id: props.member.id,
      },
    });
  // If no rows were deleted, member doesn't own a reaction on this article
  if (deleted.count === 0) {
    throw new HttpException("Forbidden", 403);
  }
}
