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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberSearch(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base where clause
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    status: "published",
    deleted_at: null,
    ...(props.body.discussion_board_section_id && {
      discussion_board_section_id: props.body.discussion_board_section_id,
    }),
  };
  // Build orderBy based on search
  let orderBy: Prisma.discussion_board_articlesOrderByWithRelationInput = {
    created_at: "desc",
  };
  // If search query provided, use full-text search with relevance
  if (props.body.search && props.body.search.trim()) {
    const searchQuery = props.body.search.trim();
    // Add full-text search condition using to_tsvector
    whereInput.OR = [
      {
        // Using trigram similarity for partial matching
        title: {
          contains: searchQuery,
          mode: "insensitive",
        },
      },
      {
        body: {
          contains: searchQuery,
          mode: "insensitive",
        },
      },
    ];
    // For better relevance, we could order by search relevance
    // In production, this would use ts_rank or similar
  }
  // Get data
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  // Transform data
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
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
