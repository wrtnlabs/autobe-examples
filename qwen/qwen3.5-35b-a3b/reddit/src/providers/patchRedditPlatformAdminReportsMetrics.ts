import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReportMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportMetric";
import { IRedditPlatformReportMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportMetric";
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

export async function patchRedditPlatformAdminReportsMetrics(props: {
  admin: AdminPayload;
  body: IRedditPlatformReportMetric.IRequest;
}): Promise<IPageIRedditPlatformReportMetric.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const statusFilter =
    props.body.status !== undefined
      ? `AND r.status = '${props.body.status}'`
      : "";
  const startDateFilter =
    props.body.startDate !== undefined
      ? `AND r.created_at >= '${props.body.startDate}'`
      : "";
  const endDateFilter =
    props.body.endDate !== undefined
      ? `AND r.created_at <= '${props.body.endDate}'`
      : "";
  const communityFilter =
    props.body.communityId !== undefined
      ? `AND r.community_id = '${props.body.communityId}'`
      : "";
  const moderatorFilter =
    props.body.moderatorId !== undefined
      ? `AND r.resolved_by_id = '${props.body.moderatorId}'`
      : "";
  const contentTypeFilter =
    props.body.reportedContentType !== undefined
      ? `AND r.reported_content_type = '${props.body.reportedContentType}'`
      : "";
  const sortBy =
    props.body.sortBy === "total_reports" ? "total_reports" : "created_at";
  const sortOrder = props.body.sortOrder === "ASC" ? "ASC" : "DESC";
  const data = (await MyGlobal.prisma.$queryRaw`
    SELECT
      r.community_id,
      c.name AS community_name,
      COUNT(r.id) AS total_reports,
      COUNT(CASE WHEN r.status = 'RESOLVED' THEN r.id END) AS resolved_count,
      COUNT(CASE WHEN r.status = 'PENDING' THEN r.id END) AS pending_count,
      COUNT(CASE WHEN r.status = 'DISMISSED' THEN r.id END) AS dismissed_count,
      AVG(CASE WHEN r.status = 'RESOLVED' THEN EXTRACT(EPOCH FROM (r.updated_at - r.created_at)) / 3600 END) AS average_resolution_time,
      MAX(r.created_at) AS last_report_at,
      MODE() WITHIN GROUP (ORDER BY r.resolved_by_id) FILTER (WHERE r.status = 'RESOLVED' AND r.resolved_by_id IS NOT NULL) AS resolved_by_id,
      MIN(r.created_at) AS created_at
    FROM reddit_platform_reports r
    JOIN reddit_platform_communities c ON r.community_id = c.id
    WHERE r.deleted_at IS NULL
      ${statusFilter}
      ${startDateFilter}
      ${endDateFilter}
      ${communityFilter}
      ${moderatorFilter}
      ${contentTypeFilter}
    GROUP BY r.community_id, c.name
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ${limit}
    OFFSET ${skip}
  `) as Array<{
    community_id: string;
    community_name: string;
    total_reports: number;
    resolved_count: number;
    pending_count: number;
    dismissed_count: number;
    average_resolution_time: number | null;
    last_report_at: string | null;
    resolved_by_id: string | null;
    created_at: string | null;
  }>;
  const totalResult = await MyGlobal.prisma.$queryRaw<
    [
      {
        total_count: number;
      },
    ]
  >`
    SELECT COUNT(*)::int AS total_count
    FROM reddit_platform_reports r
    WHERE r.deleted_at IS NULL
      ${statusFilter}
      ${startDateFilter}
      ${endDateFilter}
      ${communityFilter}
      ${moderatorFilter}
      ${contentTypeFilter}
  `;
  const total = totalResult[0]?.total_count ?? 0;
  const dataWithMetrics = data.map((item) => {
    const resolutionRate =
      item.total_reports > 0
        ? Number(((item.resolved_count / item.total_reports) * 100).toFixed(1))
        : null;
    return {
      community_id: item.community_id as string & tags.Format<"uuid">,
      community_name: item.community_name,
      total_reports: item.total_reports,
      resolved_count: item.resolved_count,
      pending_count: item.pending_count,
      dismissed_count: item.dismissed_count,
      average_resolution_time:
        item.average_resolution_time !== null
          ? Math.round(item.average_resolution_time)
          : null,
      community_threshold_flag: item.total_reports > 100,
      last_report_at: item.last_report_at as
        | (string & tags.Format<"date-time">)
        | null,
      resolved_by_id:
        item.resolved_by_id !== null
          ? (item.resolved_by_id as string & tags.Format<"uuid">)
          : null,
      resolution_rate: resolutionRate,
      created_at: item.created_at as (string & tags.Format<"date-time">) | null,
    };
  });
  return {
    data: dataWithMetrics as IRedditPlatformReportMetric.ISummary[],
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
