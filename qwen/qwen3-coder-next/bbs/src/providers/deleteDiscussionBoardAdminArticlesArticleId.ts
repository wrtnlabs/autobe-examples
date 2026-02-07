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
  // Verify the article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Authorization: Admin can delete any article
  // (Admin payload already verified by NestJS guard)
  // Delete related content in proper order (foreign key constraints)
  await MyGlobal.prisma.discussion_board_article_tags.deleteMany({
    where: { article: { id: props.articleId } },
  });
  await MyGlobal.prisma.discussion_board_article_images.deleteMany({
    where: { article: { id: props.articleId } },
  });
  await MyGlobal.prisma.discussion_board_article_files.deleteMany({
    where: { article: { id: props.articleId } },
  });
  // Delete the article record
  await MyGlobal.prisma.discussion_board_articles.delete({
    where: { id: props.articleId },
  });
}
