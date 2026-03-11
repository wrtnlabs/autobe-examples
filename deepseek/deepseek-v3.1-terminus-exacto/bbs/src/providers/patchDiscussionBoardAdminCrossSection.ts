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

export async function patchDiscussionBoardAdminCrossSection(props: {
  admin: AdminPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build base WHERE clause
  const whereClause: Prisma.discussion_board_articlesWhereInput = {
    status: "published",
    deleted_at: null,
    ...(props.body.discussion_board_section_id && {
      discussion_board_section_id: props.body.discussion_board_section_id,
    }),
  };
  // Add search condition if provided
  let finalWhere: Prisma.discussion_board_articlesWhereInput = whereClause;
  if (props.body.search && props.body.search.trim().length > 0) {
    const searchTerm = props.body.search.trim();
    // Use contains for basic text search since Prisma doesn't support 'search' operator
    finalWhere = {
      ...whereClause,
      OR: [
        {
          title: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          body: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ],
    };
  }
  // Get data with pagination
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: finalWhere,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: finalWhere,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
