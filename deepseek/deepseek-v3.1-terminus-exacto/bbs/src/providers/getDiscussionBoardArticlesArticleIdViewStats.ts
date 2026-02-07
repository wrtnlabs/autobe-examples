import { IDiscussionBoardArticleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleViewStatTransformer } from "../transformers/DiscussionBoardArticleViewStatTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdViewStats(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleViewStat> {
  // Verify article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Retrieve view statistics
  const stats =
    await MyGlobal.prisma.discussion_board_article_view_stats.findUnique({
      where: { discussion_board_article_id: props.articleId },
      ...DiscussionBoardArticleViewStatTransformer.select(),
    });
  if (!stats) {
    throw new HttpException("View statistics not found for this article", 404);
  }
  return await DiscussionBoardArticleViewStatTransformer.transform(stats);
}
