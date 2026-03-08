import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
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

export async function patchRedditPlatformAdminReportsQueue(props: {
  admin: AdminPayload;
  body: IRedditPlatformReport.IRequest;
}): Promise<IPageIRedditPlatformReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const cursor = props.body.cursor;
  const priorityThreshold = props.body.priority_threshold ?? 3;
  // Build WHERE clause for filters
  const whereInput: Prisma.reddit_platform_reportsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.content_type !== undefined && {
      reported_content_type: props.body.content_type,
    }),
    ...(props.body.community_id !== undefined && {
      community_id: props.body.community_id,
    }),
    ...(props.body.created_after !== undefined && {
      created_at: { gt: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before !== undefined && {
      created_at: { lt: new Date(props.body.created_before) },
    }),
    ...(cursor !== undefined && {
      created_at: { lt: new Date(cursor) },
    }),
  };
  // Order by - default oldest first (ASC), or by priority when requested
  const orderByInput:
    | Prisma.reddit_platform_reportsOrderByWithRelationInput[]
    | Prisma.reddit_platform_reportsOrderByWithRelationInput =
    props.body.sort_type === "PRIORITY"
      ? [
          {
            reported_content_id: "asc",
          },
        ]
      : { created_at: "asc" };
  // Query reports with reporter username and community name joins
  const reports = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: whereInput,
    orderBy:
      orderByInput as Prisma.reddit_platform_reportsOrderByWithRelationInput[],
    take: limit + 1,
    select: {
      id: true,
      reported_content_type: true,
      reported_content_id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      resolved_by_id: true,
      reporter: {
        select: {
          username: true,
        },
      },
      community: {
        select: {
          name: true,
        },
      },
    },
  });
  // Check if there's a next page
  const hasMore = reports.length > limit;
  const nextCursor: string | undefined = hasMore
    ? toISOStringSafe(reports[limit].created_at)
    : undefined;
  // Remove the extra item
  const data = reports.slice(0, limit);
  // Count total records for pagination metadata
  const total = await MyGlobal.prisma.reddit_platform_reports.count({
    where: whereInput,
  });
  // Transform to response format
  const transformedData = (await ArrayUtil.asyncMap(data, async (report) => ({
    id: report.id as string & tags.Format<"uuid">,
    reporter_username: report.reporter.username,
    community_name: report.community.name,
    reported_content_type: report.reported_content_type,
    reported_content_id: report.reported_content_id as string &
      tags.Format<"uuid">,
    reason: report.reason,
    status: report.status,
    created_at: toISOStringSafe(report.created_at),
    resolved_at: report.resolved_by_id
      ? toISOStringSafe(report.updated_at)
      : null,
  }))) as IPageIRedditPlatformReport.ISummary["data"];
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditPlatformReport.ISummary;
}
