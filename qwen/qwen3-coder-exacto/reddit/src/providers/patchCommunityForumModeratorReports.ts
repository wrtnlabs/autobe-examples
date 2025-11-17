import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityReport";
import { IPageICommunityForumCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityForumModeratorReports(props: {
  moderator: ModeratorPayload;
  body: ICommunityForumCommunityReport.IRequest;
}): Promise<IPageICommunityForumCommunityReport.ISummary> {
  // Extract pagination parameters
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build where conditions
  const where: Prisma.community_forum_reportsWhereInput = {
    deleted_at: null,
  };

  // Apply filters if provided
  if (props.body.status) {
    where.status = props.body.status;
  }

  if (props.body.actor_type) {
    where.actor_type = props.body.actor_type;
  }

  if (props.body.reason) {
    where.reason = props.body.reason;
  }

  // Build orderBy clause
  let orderBy: Prisma.community_forum_reportsOrderByWithRelationInput = {
    created_at: "desc",
  };

  if (props.body.sort_by && props.body.order) {
    // More explicit handling of sorting
    if (props.body.sort_by === "created_at") {
      orderBy = { created_at: props.body.order };
    } else if (props.body.sort_by === "updated_at") {
      orderBy = { updated_at: props.body.order };
    }
  }

  // Execute queries
  const [reports, total] = await Promise.all([
    MyGlobal.prisma.community_forum_reports.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.community_forum_reports.count({
      where,
    }),
  ]);

  // Transform to API response format
  const transformedReports = reports.map((report) => ({
    id: report.id,
    community_forum_user_id: report.community_forum_user_id,
    community_forum_moderator_id:
      report.community_forum_moderator_id ?? undefined,
    actor_type: report.actor_type,
    reason: report.reason,
    description: report.description,
    status: report.status,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at
      ? toISOStringSafe(report.deleted_at)
      : undefined,
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    },
    data: transformedReports,
  };
}
