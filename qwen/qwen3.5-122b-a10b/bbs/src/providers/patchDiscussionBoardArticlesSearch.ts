import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesSearch(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const body = props.body;
  // Parse pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = Math.min(body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: body.deleted ? undefined : null,
    ...(body.sectionId && {
      discussion_board_section_id: body.sectionId,
    }),
    ...(body.memberId && {
      discussion_board_member_id: body.memberId,
    }),
    ...(body.createdAtGte && {
      created_at: {
        gte: new Date(body.createdAtGte),
      },
    }),
    ...(body.createdAtLte && {
      created_at: {
        lte: new Date(body.createdAtLte),
      },
    }),
    ...(body.search && {
      OR: [
        {
          title: {
            contains: body.search,
          },
        },
        {
          body: {
            contains: body.search,
          },
        },
      ],
    }),
    ...(body.tagIds &&
      body.tagIds.length > 0 && {
        articleTags: {
          some: {
            discussion_board_tag_id: {
              in: body.tagIds,
            },
            deleted_at: null,
          },
        },
        // Ensure article has ALL specified tags (AND logic)
        AND: body.tagIds.map((tagId) => ({
          articleTags: {
            some: {
              discussion_board_tag_id: tagId,
              deleted_at: null,
            },
          },
        })),
      }),
  } satisfies Prisma.discussion_board_articlesWhereInput;
  // Build orderBy
  const sortBy = body.sortBy ?? "created_at";
  const sortOrder = body.sortOrder ?? "desc";
  const orderByInput: Prisma.discussion_board_articlesOrderByWithRelationInput =
    sortBy === "title" ? { title: sortOrder } : { created_at: sortOrder };
  // Execute findMany with transformer select
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  } satisfies Prisma.discussion_board_articlesFindManyArgs);
  // Execute count
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    articles,
    DiscussionBoardArticleAtSummaryTransformer.transform,
  );
  // Calculate pages
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
