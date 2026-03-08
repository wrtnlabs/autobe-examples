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

export async function patchRedditPlatformAdminReportsDashboard(props: {
  admin: AdminPayload;
  body: IRedditPlatformReport.IRequest;
}): Promise<IPageIRedditPlatformReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const cursor = props.body.cursor ?? undefined;
  const statusFilter = props.body.status ?? "PENDING";
  const contentTypeFilter = props.body.content_type ?? undefined;
  const reporterIdFilter = props.body.reporter_id ?? undefined;
  const communityIdsFilter = props.body.community_ids ?? undefined;
  const createdAfter = props.body.created_after ?? undefined;
  const createdBefore = props.body.created_before ?? undefined;
  const reasonSearch = props.body.reason_search ?? undefined;
  const sortType = props.body.sort_type ?? "CREATED";
  const adminId = props.admin.id;
  const moderatorAssignments =
    await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
      where: {
        user_id: adminId,
      },
      select: {
        community_id: true,
      },
    });
  if (moderatorAssignments.length === 0) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  const communityIds = moderatorAssignments.map((ma) => ma.community_id);
  const whereConditions: Prisma.reddit_platform_reportsWhereInput = {
    deleted_at: null,
    status: statusFilter,
    ...(contentTypeFilter && { reported_content_type: contentTypeFilter }),
    ...(reporterIdFilter && { reporter_id: reporterIdFilter }),
    ...(createdAfter && { created_at: { gte: createdAfter } }),
    ...(createdBefore && { created_at: { lte: createdBefore } }),
    ...(reasonSearch && { reason: { contains: reasonSearch } }),
  };
  if (communityIdsFilter && communityIdsFilter.length > 0) {
    whereConditions.community_id = { in: communityIdsFilter };
  } else {
    whereConditions.community_id = { in: communityIds };
  }
  if (cursor) {
    whereConditions.created_at = { lt: cursor };
  }
  const orderBy: Prisma.reddit_platform_reportsOrderByWithRelationInput[] =
    sortType === "CREATED"
      ? [{ created_at: "desc" }]
      : [{ created_at: "desc" }];
  const reports = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: whereConditions,
    orderBy: orderBy,
    take: limit + 1,
    select: {
      id: true,
      reporter_id: true,
      community_id: true,
      reported_content_type: true,
      reported_content_id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      resolved_by_id: true,
      reporter: { select: { username: true } },
      community: { select: { name: true } },
    },
  });
  const hasMore = reports.length > limit;
  const finalReports = hasMore ? reports.slice(0, limit) : reports;
  const data: IRedditPlatformReport.ISummary[] = finalReports.map((report) => {
    const resolvedAt: (string & tags.Format<"date-time">) | null =
      report.status === "RESOLVED" && report.resolved_by_id
        ? toISOStringSafe(report.updated_at)
        : null;
    return {
      id: report.id,
      reporter_username: report.reporter.username,
      community_name: report.community.name,
      reported_content_type: report.reported_content_type,
      reported_content_id: report.reported_content_id,
      reason: report.reason,
      status: report.status,
      created_at: toISOStringSafe(report.created_at),
      resolved_at: resolvedAt,
    } satisfies IRedditPlatformReport.ISummary;
  });
  const total = await MyGlobal.prisma.reddit_platform_reports.count({
    where: whereConditions,
  });
  const lastCreatedAt: (string & tags.Format<"date-time">) | undefined = hasMore
    ? toISOStringSafe(finalReports[finalReports.length - 1].created_at)
    : undefined;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } as IPageIRedditPlatformReport.ISummary;
}
