import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the article. 404 if not found.
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Transactional hard delete of all business-dependent rows
  await MyGlobal.prisma.$transaction([
    // Delete all comment snapshots related to this article
    MyGlobal.prisma.discussion_board_comment_snapshots.deleteMany({
      where: { discussion_board_article_id: props.articleId },
    }),
    // Delete all comments belonging to this article
    MyGlobal.prisma.discussion_board_comments.deleteMany({
      where: { discussion_board_article_id: props.articleId },
    }),
    // Delete all attachment rows linked to this article
    MyGlobal.prisma.discussion_board_article_attachments.deleteMany({
      where: { article_id: props.articleId },
    }),
    // Delete all article snapshots for this article
    MyGlobal.prisma.discussion_board_article_snapshots.deleteMany({
      where: { article_id: props.articleId },
    }),
    // Delete all moderation logs for this article
    MyGlobal.prisma.discussion_board_moderation_logs.deleteMany({
      where: { target_type: "article", target_id: props.articleId },
    }),
    // Permanently delete the article itself
    MyGlobal.prisma.discussion_board_articles.delete({
      where: { id: props.articleId },
    }),
  ]);
}
