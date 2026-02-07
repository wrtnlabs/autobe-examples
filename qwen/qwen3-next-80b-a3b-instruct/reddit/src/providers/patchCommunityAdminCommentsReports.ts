import { ICommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdminCommentsReports(props: {
  admin: AdminPayload;
  body: ICommunityCommentReport.IRequest;
}): Promise<IPageICommunityCommentReport.ISummary> {
  const page = props.body.offset
    ? Math.floor(props.body.offset / (props.body.limit || 100)) + 1
    : 1;
  const limit = props.body.limit || 100;
  const skip = props.body.offset || 0;
  // Build dynamic where clause
  const where: Prisma.community_comment_reportsWhereInput = {
    deleted_at: null,
    status: props.body.status,
    reporter_id: props.body.reporter_id,
    reported_comment_id: props.body.reported_comment_id,
    created_at: {
      gte: props.body.created_at_start,
      lte: props.body.created_at_end,
    },
  };
  // Build dynamic order by clause
  const orderBy: Prisma.community_comment_reportsOrderByWithRelationInput = {};
  if (props.body.sort_by === "created_at") {
    orderBy.created_at = props.body.order === "asc" ? "asc" : "desc";
  } else if (props.body.sort_by === "status") {
    orderBy.status = props.body.order === "asc" ? "asc" : "desc";
  } else if (props.body.sort_by === "reporter_type") {
    // Order by reporter_type - since this is not a direct field, we need to join with community_members or community_admins
    // This requires complex query structure
    // TODO: Need to implement proper JOIN and ordering
  }
  // If no sort_by specified, default to created_at descending
  if (Object.keys(orderBy).length === 0) {
    orderBy.created_at = "desc";
  }
  const data = await MyGlobal.prisma.community_comment_reports.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      status: true,
      created_at: true,
      reported_comment_id: true,
      reporter_id: true,
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.community_comment_reports.count({
    where,
  });
  // Transform data to summary format
  // Need to join with community_comments and community_members/community_admins
  // TODO: Need to implement proper transformation with joined data
  return {
    data: data as ICommunityCommentReport.ISummary[],
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
