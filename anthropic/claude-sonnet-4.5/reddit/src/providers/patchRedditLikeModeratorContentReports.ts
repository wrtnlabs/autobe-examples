import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import { IPageIRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeContentReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditLikeModeratorContentReports(props: {
  moderator: ModeratorPayload;
  body: IRedditLikeContentReport.IRequest;
}): Promise<IPageIRedditLikeContentReport> {
  const { moderator, body } = props;

  // Set defaults for pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // CRITICAL: Get list of communities this moderator has permissions for
  const moderatorAssignments =
    await MyGlobal.prisma.reddit_like_community_moderators.findMany({
      where: {
        moderator_id: moderator.id,
      },
      select: {
        community_id: true,
      },
    });

  const authorizedCommunityIds = moderatorAssignments.map(
    (assignment) => assignment.community_id,
  );

  // If moderator has no community assignments, return empty results
  if (authorizedCommunityIds.length === 0) {
    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // If community_id filter is provided, verify it's in authorized list
  if (body.community_id !== undefined && body.community_id !== null) {
    if (!authorizedCommunityIds.includes(body.community_id)) {
      throw new HttpException(
        "Unauthorized: You do not have moderation permissions for this community",
        403,
      );
    }
  }

  // Build WHERE clause with authorization and filters
  const whereCondition = {
    community_id:
      body.community_id !== undefined && body.community_id !== null
        ? body.community_id
        : { in: authorizedCommunityIds },
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.content_type !== undefined &&
      body.content_type !== null && {
        content_type: body.content_type,
      }),
    ...(body.is_high_priority !== undefined &&
      body.is_high_priority !== null && {
        is_high_priority: body.is_high_priority,
      }),
  };

  // Execute query with pagination
  const [reports, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_content_reports.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_like_content_reports.count({
      where: whereCondition,
    }),
  ]);

  // Transform to API response format
  const data: IRedditLikeContentReport[] = reports.map((report) => ({
    id: report.id,
    content_type: report.content_type,
    violation_categories: report.violation_categories,
    additional_context: report.additional_context ?? undefined,
    status: report.status,
    is_anonymous_report: report.is_anonymous_report,
    is_high_priority: report.is_high_priority,
    created_at: toISOStringSafe(report.created_at),
  }));

  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
