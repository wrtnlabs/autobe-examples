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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminPopular(props: {
  admin: AdminPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    status: "published",
    deleted_at: null,
    ...(props.body.discussion_board_section_id && {
      discussion_board_section_id: props.body.discussion_board_section_id,
    }),
  } satisfies Prisma.discussion_board_articlesWhereInput;
  // Full-text search condition
  let searchWhere: Prisma.discussion_board_articlesWhereInput | undefined =
    undefined;
  if (props.body.search && props.body.search.trim()) {
    searchWhere = {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { body: { contains: props.body.search, mode: "insensitive" } },
      ],
    };
  }
  // Combine where conditions
  const finalWhere = searchWhere
    ? { AND: [whereInput, searchWhere] }
    : whereInput;
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: finalWhere,
  });
  // Fetch raw data for popularity scoring
  const rawArticles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: finalWhere,
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      body: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      discussion_board_member_id: true,
      discussion_board_section_id: true,
      viewStats: {
        select: { id: true },
        where: { deleted_at: null },
      },
      reactions: {
        select: { id: true },
      },
      commentStatistic: {
        select: { total_comment_count: true },
      },
    },
  });
  // Calculate popularity score for each article
  const scoredArticles = rawArticles.map((article) => {
    const viewCount = article.viewStats.length;
    const reactionCount = article.reactions.length;
    const commentCount = article.commentStatistic?.total_comment_count ?? 0;
    // Weighted popularity formula: views*1 + reactions*3 + comments*2
    const popularityScore =
      viewCount * 1 + reactionCount * 3 + commentCount * 2;
    return {
      article,
      popularityScore,
      created_at: article.created_at,
    };
  });
  // Sort by popularity score (descending), then recency
  scoredArticles.sort((a, b) => {
    if (b.popularityScore !== a.popularityScore) {
      return b.popularityScore - a.popularityScore;
    }
    return b.created_at.getTime() - a.created_at.getTime();
  });
  // Get sorted article IDs
  const sortedIds = scoredArticles.map((item) => item.article.id);
  // Fetch full article data with transformers for the sorted results
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: {
      id: { in: sortedIds },
    },
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  // Reorder to match sortedIds order
  const articleMap = new Map(articles.map((article) => [article.id, article]));
  const orderedArticles = sortedIds
    .map((id) => articleMap.get(id))
    .filter(Boolean) as DiscussionBoardArticleAtSummaryTransformer.Payload[];
  const transformedData = await ArrayUtil.asyncMap(
    orderedArticles,
    DiscussionBoardArticleAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
