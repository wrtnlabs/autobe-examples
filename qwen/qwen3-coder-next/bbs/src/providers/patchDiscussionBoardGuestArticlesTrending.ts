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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardGuestArticlesTrending(props: {
  guest: GuestPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const minViews = 0;
  // Build where clause with filters
  const whereClause: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
    view_count: { gte: minViews },
  };
  // Get trending articles with calculated score
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: {
      view_count: "desc",
    },
    select: {
      id: true,
      title: true,
      content: true,
      view_count: true,
      created_at: true,
      updated_at: true,
      author_id: true,
    },
  });
  // Calculate total count
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereClause,
  });
  // Transform to summary format
  const summaries: IDiscussionBoardArticle.ISummary[] = articles.map(
    (article) => ({
      id: article.id,
      title: article.title,
      view_count: article.view_count,
      created_at: toISOStringSafe(article.created_at),
      author_id: article.author_id,
    }),
  );
  return {
    data: summaries,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
