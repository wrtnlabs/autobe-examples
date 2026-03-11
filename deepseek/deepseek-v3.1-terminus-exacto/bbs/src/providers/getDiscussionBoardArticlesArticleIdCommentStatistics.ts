import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardMvArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvArticleComment";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardMvArticleCommentTransformer } from "../transformers/DiscussionBoardMvArticleCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdCommentStatistics(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMvArticleComment> {
  // Try to find existing comment statistics
  const stats =
    await MyGlobal.prisma.discussion_board_mv_article_comments.findUnique({
      where: {
        discussion_board_article_id: props.articleId,
      },
      ...DiscussionBoardMvArticleCommentTransformer.select(),
    });
  // If statistics exist, transform and return them
  if (stats) {
    return await DiscussionBoardMvArticleCommentTransformer.transform(stats);
  }
  // No statistics exist (article has no comments)
  // Check if article exists using the transformer's select pattern
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  if (!article) {
    // Article doesn't exist - throw 404 error since we can't provide valid statistics
    throw new HttpException("Article not found", 404);
  }
  // Article exists but has no comments - transform the article and return default statistics
  const transformedArticle =
    await DiscussionBoardArticleAtSummaryTransformer.transform(article);
  return {
    id: v4(),
    article: transformedArticle,
    totalCommentCount: 0,
    latestCommentTimestamp: null,
    refreshTimestamp: new Date().toISOString(),
  };
}
