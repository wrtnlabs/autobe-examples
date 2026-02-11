import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityOwnerReports(props: {
  communityOwner: CommunityownerPayload;
  body: IRedditCommunityCommentReport.IRequest;
}): Promise<IPageIRedditCommunityCommentReport> {
  const {
    status,
    target_type,
    comment_id,
    reason,
    created_at_start,
    created_at_end,
    sortBy,
    page,
    limit,
  } = props.body;
  const skip = (page - 1) * limit;
  // Build dynamic where clause based on filters
  const where: Prisma.reddit_community_comment_reportsWhereInput = {
    status: status,
    ...(comment_id && { comment_id: comment_id }),
    ...(reason && { reason: { contains: reason } }),
    ...(created_at_start && { created_at: { gte: created_at_start } }),
    ...(created_at_end && { created_at: { lte: created_at_end } }),
  };
  // The specification says target_type can be 'post' but the database schema shows no post_id field.
  // Since reddit_community_comment_reports has NO post_id column, we cannot filter by target_type = 'post'.
  // This is an inconsistency. Implementation must follow database schema, not specification.
  // Therefore, target_type filter is ignored. All reports are comment reports.
  // Count total matching records
  const total = await MyGlobal.prisma.reddit_community_comment_reports.count({
    where: where,
  });
  // Retrieve data with required relations using select
  const data = await MyGlobal.prisma.reddit_community_comment_reports.findMany({
    where: where,
    skip,
    take: limit,
    orderBy: {
      created_at: sortBy === "newest" ? "desc" : "asc",
    },
    select: {
      id: true,
      comment_id: true,
      reporter_id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      resolved_at: true,
      reporter: {
        select: {
          id: true,
        },
      },
      comment: {
        select: {
          id: true,
        },
      },
    },
  });
  // Transform Prisma output to IRedditCommunityCommentReport
  const transformedData: IRedditCommunityCommentReport[] = data.map((item) => {
    return {
      id: item.id,
      comment_id: item.comment_id,
      reporter_id: item.reporter_id,
      reason: item.reason,
      status: typia.assert<"pending" | "approved" | "dismissed">(item.status),
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      resolved_at: item.resolved_at ? toISOStringSafe(item.resolved_at) : null,
    };
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
