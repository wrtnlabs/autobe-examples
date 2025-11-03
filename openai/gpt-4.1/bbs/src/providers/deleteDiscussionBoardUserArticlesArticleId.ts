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
  // Lookup the article, ensure it exists, is not already deleted, and is owned by this user
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article || article.deleted_at !== null) {
    throw new HttpException("Article not found or already deleted.", 404);
  }
  if (article.author_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You may only delete your own articles.",
      403,
    );
  }
  // Soft delete by updating deleted_at to now (as ISO string)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: { deleted_at: now },
  });
}
