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

export async function patchDiscussionBoardMemberCrossSection(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build WHERE condition
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    status: "published",
    deleted_at: null,
    section: {
      deleted_at: null, // Ensure section is not soft-deleted
    },
  };
  // Filter by section if specified
  if (props.body.discussion_board_section_id !== undefined) {
    whereInput.discussion_board_section_id =
      props.body.discussion_board_section_id;
  }
  // Full-text search using trigram indexes
  if (props.body.search !== undefined && props.body.search.trim() !== "") {
    const searchTerm = props.body.search.trim();
    whereInput.OR = [
      { title: { contains: searchTerm, mode: "insensitive" } },
      { body: { contains: searchTerm, mode: "insensitive" } },
    ];
  }
  // Note: IRequest DTO doesn't have tags property, only search and section_id
  // So tag filtering would be implemented later if needed
  // Count total records matching filters
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  // Fetch paginated results using transformer for proper joins
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  // Transform results using transformer
  const transformed = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  };
}
