import { IDiscussionBoardCommentPaginationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentPaginationSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdCommentPaginationSettings(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentPaginationSetting> {
  // First verify the article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Retrieve the pagination settings using the unique constraint on article_id
  const settings =
    await MyGlobal.prisma.discussion_board_comment_pagination_settings.findUnique(
      {
        where: { discussion_board_article_id: props.articleId },
        select: {
          id: true,
          comments_per_page: true,
          total_comment_count: true,
          last_comment_count_update: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  if (!settings) {
    throw new HttpException(
      "Comment pagination settings not found for this article",
      404,
    );
  }
  // Transform the database record to response DTO
  return {
    id: settings.id,
    comments_per_page: settings.comments_per_page,
    total_comment_count: settings.total_comment_count,
    last_comment_count_update: toISOStringSafe(
      settings.last_comment_count_update,
    ),
    created_at: toISOStringSafe(settings.created_at),
    updated_at: toISOStringSafe(settings.updated_at),
  };
}
