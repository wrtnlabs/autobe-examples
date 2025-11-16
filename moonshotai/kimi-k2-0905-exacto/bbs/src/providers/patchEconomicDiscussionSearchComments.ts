import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IPageIEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";

export async function patchEconomicDiscussionSearchComments(props: {
  body: IEconomicDiscussionComment.IRequest;
}): Promise<IPageIEconomicDiscussionComment.ISummary> {
  // Parse request parameters with defaults
  const {
    search,
    article_id,
    member_id,
    parent_id,
    status,
    sort_by = "created_at",
    order = "desc",
    page = 1,
    limit = 20,
    created_after,
    created_before,
  } = props.body;

  // Calculate pagination
  const pageNum = Math.max(1, page);
  const limitNum = Math.max(1, Math.min(100, limit));
  const skip = (pageNum - 1) * limitNum;

  // Build dynamic where clause with type safety
  const whereClause: Record<string, unknown> = {};

  if (article_id !== undefined && article_id !== null) {
    whereClause.economic_discussion_article_id = article_id;
  }
  if (member_id !== undefined && member_id !== null) {
    whereClause.economic_discussion_member_id = member_id;
  }
  if (parent_id !== undefined && parent_id !== null) {
    whereClause.parent_id = parent_id;
  }
  if (status !== undefined && status !== null) {
    whereClause.status = status;
  }
  if (created_after !== undefined && created_after !== null) {
    whereClause.created_at = {
      ...(whereClause.created_at || {}),
      gte: created_after,
    };
  }
  if (created_before !== undefined && created_before !== null) {
    whereClause.created_at = {
      ...(whereClause.created_at || {}),
      lte: created_before,
    };
  }

  // Add text search condition - leverages PostgreSQL text search capabilities
  if (search !== undefined && search !== null && search.trim().length > 0) {
    whereClause.content = {
      contains: search,
    };
  }

  // Construct order by clause - for relevance fallback to created_at
  let orderBy: Record<string, "asc" | "desc"> = {};
  switch (sort_by) {
    case "status":
    case "relevance":
    case "created_at":
    default:
      orderBy = { created_at: order };
      break;
  }

  // Execute parallel queries for data and count
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.economic_discussion_comments.findMany({
      where: whereClause,
      skip,
      take: limitNum,
      orderBy,
    }),
    MyGlobal.prisma.economic_discussion_comments.count({ where: whereClause }),
  ]);

  // Transform database records to API response format
  const summaries = comments.map((comment) => ({
    id: comment.id as string & tags.Format<"uuid">,
    economic_discussion_article_id:
      comment.economic_discussion_article_id as string & tags.Format<"uuid">,
    economic_discussion_member_id:
      comment.economic_discussion_member_id as string & tags.Format<"uuid">,
    content: comment.content,
    status: comment.status as "pending" | "approved" | "rejected",
    created_at: toISOStringSafe(comment.created_at) as string &
      tags.Format<"date-time">,
    is_reply: comment.parent_id !== null,
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limitNum);

  // Return standardized paginated response with proper type matching
  return {
    data: summaries,
    pagination: {
      current: typia.assert<ICrIPageIntegerRequired>(pageNum),
      limit: typia.assert<ICrIPageIntegerRequired>(limitNum),
      records: typia.assert<ICrIPageIntegerRequired>(total),
      pages: typia.assert<ICrIPageIntegerRequired>(totalPages),
    },
  };
}
