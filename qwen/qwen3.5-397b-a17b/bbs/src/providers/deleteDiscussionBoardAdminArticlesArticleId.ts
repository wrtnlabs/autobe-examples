import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify article exists and is not already deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true, deleted_at: true },
  });
  if (article === null) {
    throw new HttpException("Article not found", 404);
  }
  if (article.deleted_at !== null) {
    throw new HttpException("Article already deleted", 409);
  }
  // Set deleted_at timestamp (soft delete)
  // Cascade deletion automatically handles:
  // - discussion_board_article_files
  // - discussion_board_article_images
  // - discussion_board_article_tags
  // - discussion_board_comments
  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
