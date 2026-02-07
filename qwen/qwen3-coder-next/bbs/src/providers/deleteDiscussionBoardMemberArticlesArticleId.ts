import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
}): Promise<IDiscussionBoardArticle> {
  // Find the article first
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  // Check if article exists
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Check authorization (article author or administrator)
  if (article.author_id !== props.member.id) {
    // Check if member is administrator
    const adminRole =
      await MyGlobal.prisma.discussion_board_admins_roles.findFirst({
        where: { user_id: props.member.id },
      });
    if (!adminRole) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Delete related file attachments
  await MyGlobal.prisma.discussion_board_article_files.deleteMany({
    where: { discussion_board_article_id: props.articleId },
  });
  // Delete related image attachments
  await MyGlobal.prisma.discussion_board_article_images.deleteMany({
    where: { discussion_board_article_id: props.articleId },
  });
  // Delete related article tags
  await MyGlobal.prisma.discussion_board_article_tags.deleteMany({
    where: { bbs_article_id: props.articleId },
  });
  // Delete the article
  await MyGlobal.prisma.discussion_board_articles.delete({
    where: { id: props.articleId },
  });
  // Return the deleted article (convert to response format)
  return {
    id: article.id,
    author_id: article.author_id,
    section_id: article.section_id,
    title: article.title,
    content: article.content,
    view_count: article.view_count,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at: article.deleted_at ? toISOStringSafe(article.deleted_at) : null,
  };
}
