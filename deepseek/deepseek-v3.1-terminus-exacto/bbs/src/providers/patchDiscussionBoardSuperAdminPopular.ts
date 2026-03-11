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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminPopular(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereInput = {
    deleted_at: null,
    status: "published",
    ...(props.body.discussion_board_section_id !== undefined && {
      discussion_board_section_id: props.body.discussion_board_section_id,
    }),
  } satisfies Prisma.discussion_board_articlesWhereInput;
  // Text search condition
  let searchWhereInput: any = {};
  if (props.body.search) {
    searchWhereInput = {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { body: { contains: props.body.search, mode: "insensitive" } },
      ],
    } satisfies Prisma.discussion_board_articlesWhereInput;
  }
  // Get counts for popularity calculation
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: { ...whereInput, ...searchWhereInput },
    include: {
      author: {
        select: {
          id: true,
          display_name: true,
          bio: true,
        },
      },
      section: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
        },
      },
      tags: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
        },
      },
      viewStats: {
        select: { id: true },
      },
      reactions: {
        select: { id: true },
      },
      commentStatistic: {
        select: { id: true },
      },
      comments: {
        select: { id: true },
      },
      snapshots: {
        select: { id: true },
      },
      favorites: {
        select: { id: true },
      },
      metadatum: {
        select: { id: true },
      },
      attachments: {
        select: { id: true },
      },
    },
    take: limit,
    skip: skip,
  });
  // Calculate popularity scores
  const scoredArticles = articles.map((article) => {
    const viewCount = article.viewStats.length;
    const reactionCount = article.reactions.length;
    const commentCount = article.comments.length;
    // Weighted score (views: 0.4, reactions: 0.3, comments: 0.3)
    const rawScore = viewCount * 0.4 + reactionCount * 0.3 + commentCount * 0.3;
    // Recency factor (more recent articles get boost)
    const daysOld = Math.max(
      1,
      (Date.now() - article.created_at.getTime()) / (1000 * 60 * 60 * 24),
    );
    const recencyFactor = Math.exp(-0.1 * Math.log(daysOld));
    return {
      article,
      popularityScore: rawScore * recencyFactor,
      viewCount,
      reactionCount,
      commentCount,
    };
  });
  // Sort by popularity
  scoredArticles.sort((a, b) => b.popularityScore - a.popularityScore);
  // Transform filtered articles
  const data = await ArrayUtil.asyncMap(
    scoredArticles.map((s) => s.article),
    DiscussionBoardArticleAtSummaryTransformer.transform,
  );
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: { ...whereInput, ...searchWhereInput },
  });
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
