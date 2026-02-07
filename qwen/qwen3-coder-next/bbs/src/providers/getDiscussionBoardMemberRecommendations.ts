import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberRecommendations(props: {
  member: MemberPayload;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = 1; // Default page
  const limit = 10; // Default limit
  const skip = (page - 1) * limit;
  // Get member's browsing history - using discussion_board_articles as the source since views table doesn't exist
  const memberHistory =
    await MyGlobal.prisma.discussion_board_articles.findMany({
      where: {
        author_id: props.member.id,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 10, // Last 10 articles
    });
  // Extract article IDs to exclude
  const excludedArticleIds = memberHistory.map((h) => h.id);
  // Build recommendation query - find articles by same authors as member's history
  const recommendations =
    await MyGlobal.prisma.discussion_board_articles.findMany({
      where: {
        deleted_at: null,
        id: {
          notIn: excludedArticleIds,
        },
        author_id: {
          in: memberHistory.map((h) => h.author_id),
        },
      },
      orderBy: {
        view_count: "desc", // Prefer popular articles
      },
      skip,
      take: limit,
    });
  // Count total recommendations
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      deleted_at: null,
      id: {
        notIn: excludedArticleIds,
      },
      author_id: {
        in: memberHistory.map((h) => h.author_id),
      },
    },
  });
  // Transform to response format
  const data = recommendations.map((article) => ({
    id: article.id,
    title: article.title,
    view_count: article.view_count,
    created_at: toISOStringSafe(article.created_at),
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
