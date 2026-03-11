import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardGuestPopular(props: {
  guest: GuestPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const whereClause: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
    status: "published",
    ...(props.body.discussion_board_section_id && {
      discussion_board_section_id: props.body.discussion_board_section_id,
    }),
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { body: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  };
  // First, get all candidate articles with their engagement metrics
  const articlesWithEngagement =
    await MyGlobal.prisma.discussion_board_articles.findMany({
      where: whereClause,
      select: {
        id: true,
        created_at: true,
        viewStats: {
          select: { id: true },
        } satisfies Prisma.discussion_board_article_view_statsFindManyArgs,
        reactions: {
          select: { id: true },
        } satisfies Prisma.discussion_board_article_reactionsFindManyArgs,
        commentStatistic: {
          select: { total_comment_count: true },
        } satisfies Prisma.discussion_board_mv_article_commentsFindManyArgs,
      },
    });
  // Calculate popularity scores
  const articlesWithScores = articlesWithEngagement.map((article) => {
    const viewCount = article.viewStats.length;
    const reactionCount = article.reactions.length;
    const commentCount = article.commentStatistic?.total_comment_count ?? 0;
    const daysSincePublication = Math.max(
      1,
      Math.floor(
        (new Date().getTime() - article.created_at.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    // Weighted popularity formula
    const score =
      viewCount * 0.4 +
      reactionCount * 0.3 +
      commentCount * 0.2 -
      daysSincePublication * 0.1;
    return {
      id: article.id,
      score,
    };
  });
  // Sort by score descending
  articlesWithScores.sort((a, b) => b.score - a.score);
  // Get paginated article IDs
  const paginatedIds = articlesWithScores
    .slice(skip, skip + limit)
    .map((item) => item.id);
  // Fetch full article data for paginated results
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: {
      ...whereClause,
      id: { in: paginatedIds },
    },
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
    orderBy: { created_at: "desc" },
  });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleAtSummaryTransformer.transform,
  );
  // Order transformed data to match popularity ranking
  const orderedData = paginatedIds
    .map((id) => transformedData.find((item) => item.id === id))
    .filter(Boolean) as IDiscussionBoardArticle.ISummary[];
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereClause,
  });
  return {
    data: orderedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
