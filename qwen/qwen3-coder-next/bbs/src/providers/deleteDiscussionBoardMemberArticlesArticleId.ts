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
  articleId: string;
}): Promise<void> {
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    select: {
      id: true,
      author_id: true,
    },
  });
  if (article === null) {
    throw new HttpException("Article not found", 404);
  }
  if (article.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Cascade delete related records
  await MyGlobal.prisma.discussion_board_article_files.deleteMany({
    where: { article_id: props.articleId },
  });
  await MyGlobal.prisma.discussion_board_article_images.deleteMany({
    where: { article: { id: props.articleId } },
  });
  await MyGlobal.prisma.discussion_board_comments.deleteMany({
    where: { article_id: props.articleId },
  });
  await MyGlobal.prisma.discussion_board_article_tags.deleteMany({
    where: { article_id: props.articleId },
  });
  // Delete the article record
  await MyGlobal.prisma.discussion_board_articles.delete({
    where: { id: props.articleId },
  });
}
