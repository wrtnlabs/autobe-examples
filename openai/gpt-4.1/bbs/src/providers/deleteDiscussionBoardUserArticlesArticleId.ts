import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteDiscussionBoardUserArticlesArticleId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the article (must exist and be authored by user)
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });

  if (!article) {
    throw new HttpException("Article not found.", 404);
  }
  if (article.user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to delete this article.",
      403,
    );
  }

  // Use a transaction for integrity on cascade deletes
  await MyGlobal.prisma.$transaction([
    // Delete all attachments for this article
    MyGlobal.prisma.discussion_board_article_attachments.deleteMany({
      where: { article_id: props.articleId },
    }),
    // Delete all comments for this article
    MyGlobal.prisma.discussion_board_comments.deleteMany({
      where: { discussion_board_article_id: props.articleId },
    }),
    // Delete the article itself
    MyGlobal.prisma.discussion_board_articles.delete({
      where: { id: props.articleId },
    }),
  ]);
  // No result to return on hard delete
}
