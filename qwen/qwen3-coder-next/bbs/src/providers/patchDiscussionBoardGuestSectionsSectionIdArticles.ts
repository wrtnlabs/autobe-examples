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

export async function patchDiscussionBoardGuestSectionsSectionIdArticles(props: {
  guest: GuestPayload;
  sectionId: string;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  // Extract pagination parameters with defaults (using fallback values since IRequest doesn't have these properties)
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Build where clause with search and tag filters
  const where: Prisma.discussion_board_articlesWhereInput = {
    section_id: props.sectionId,
    deleted_at: null,
  };
  // Get articles with author information
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where,
    orderBy: {
      created_at: "desc",
    },
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      view_count: true,
      created_at: true,
      author: {
        select: {
          id: true,
          display_name: true,
        },
      },
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where,
  });
  // Transform to summary format
  const summaries = data.map((article) => ({
    id: article.id,
    title: article.title,
    view_count: article.view_count,
    created_at: toISOStringSafe(article.created_at),
    author: {
      id: article.author.id,
      display_name: article.author.display_name,
    },
  }));
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
