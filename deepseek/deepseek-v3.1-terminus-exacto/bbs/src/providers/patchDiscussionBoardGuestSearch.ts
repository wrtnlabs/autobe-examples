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

export async function patchDiscussionBoardGuestSearch(props: {
  guest: GuestPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause - core filters
  const whereClause = {
    deleted_at: null,
    status: "published",
    ...(props.body.discussion_board_section_id && {
      discussion_board_section_id: props.body.discussion_board_section_id,
    }),
  } satisfies Prisma.discussion_board_articlesWhereInput;
  // Add search filters if search query provided
  const whereWithSearch = props.body.search
    ? {
        ...whereClause,
        OR: [
          {
            title: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            body: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : whereClause;
  // Note: Tag filtering not implemented in this iteration as IRequest DTO doesn't include tags parameter
  // Future enhancement: add tags parameter to IRequest if needed
  // Get data with transformer select
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereWithSearch,
    skip,
    take: limit,
    orderBy: [
      // Order by recency only since _relevance is not supported
      { created_at: "desc" as const },
    ],
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  // Count total matching records
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereWithSearch,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleAtSummaryTransformer.transform,
  );
  // Return paginated response
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
