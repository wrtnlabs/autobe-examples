import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteDiscussionBoardUserArticlesArticleId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  // Fetch the article
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (article.author_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: you are not the author of this article",
      403,
    );
  }

  // Hard-delete article since soft delete is not supported (no deleted_at field)
  await MyGlobal.prisma.discussion_board_articles.delete({
    where: { id: props.articleId },
  });

  // Hard-delete all attachments
  await MyGlobal.prisma.discussion_board_article_attachments.deleteMany({
    where: { article_id: props.articleId },
  });

  // Hard-delete all comments
  await MyGlobal.prisma.discussion_board_comments.deleteMany({
    where: { discussion_board_article_id: props.articleId },
  });

  // Build response using the last snapshot of the article
  return {
    id: article.id,
    title: article.title,
    body: article.body,
    author_user: undefined,
    author_admin: undefined,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
  };
}
