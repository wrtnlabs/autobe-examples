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

export async function deleteDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the article (must exist and not be already deleted)
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    select: {
      id: true,
      member_id: true,
    },
  });
  if (article === null) {
    throw new HttpException("Article not found", 404);
  }
  // Verify ownership - members can only delete their own articles
  if (article.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if member is banned (defensive check, though memberAuthorize should handle this)
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.member.id },
    select: { banned: true },
  });
  if (member?.banned === true) {
    throw new HttpException("Forbidden", 403);
  }
  // Execute soft delete in transaction
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    // Soft delete the article
    MyGlobal.prisma.discussion_board_articles.update({
      where: { id: props.articleId },
      data: { deleted_at: now },
    }),
    // Soft delete all comments associated with the article
    MyGlobal.prisma.discussion_board_comments.updateMany({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
      data: { deleted_at: now },
    }),
    // Hard delete attachments (no deleted_at column in schema)
    MyGlobal.prisma.discussion_board_article_attachments.deleteMany({
      where: { discussion_board_article_id: props.articleId },
    }),
  ]);
}
