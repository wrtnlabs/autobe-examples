import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIReportsAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIReportsAnalytic";
import { IReportsAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IReportsAnalytic";
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

export async function patchRedditPlatformAdminReportsAnalytics(props: {
  admin: AdminPayload;
  body: IReportsAnalytic.IRequest;
}): Promise<IPageIReportsAnalytic> {
  const page: number & tags.Type<"int32"> & tags.Minimum<0> =
    props.body.page ?? 1;
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> =
    props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // Validate date range
  if (props.body.startDate && props.body.endDate) {
    const start = props.body.startDate;
    const end = props.body.endDate;
    if (start > end) {
      throw new HttpException(
        "End date must be after or equal to start date",
        400,
      );
    }
    const startDateObj = new Date(start + "T00:00:00Z");
    const endDateObj = new Date(end + "T23:59:59Z");
    const diffDays = Math.floor(
      (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays > 365) {
      throw new HttpException("Date range cannot exceed 365 days", 400);
    }
  }
  // Get user's communities (for admin, all communities accessible)
  const adminCommunities =
    await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
      where: {
        user_id: props.admin.id,
      },
      select: { community_id: true },
    });
  const communityIds: string[] = adminCommunities.map((cm) => cm.community_id);
  if (communityIds.length === 0) {
    throw new HttpException("No community moderation permissions found", 403);
  }
  // Build where clause
  const where: Prisma.reddit_platform_reportsWhereInput = {
    deleted_at: null,
    community_id: { in: communityIds },
    ...(props.body.communityId && { community_id: props.body.communityId }),
    ...(props.body.startDate && {
      created_at: { gte: new Date(props.body.startDate + "T00:00:00Z") },
    }),
    ...(props.body.endDate && {
      created_at: { lte: new Date(props.body.endDate + "T23:59:59Z") },
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.contentType && {
      reported_content_type: props.body.contentType,
    }),
  };
  // Get total count
  const total: number & tags.Type<"int32"> & tags.Minimum<0> =
    await MyGlobal.prisma.reddit_platform_reports.count({
      where,
    });
  // Get reports for current page
  const reports = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      reporter: { select: { id: true, username: true } },
      community: { select: { id: true, name: true } },
      resolvedBy: { select: { id: true } },
    },
  });
  // Calculate aggregated metrics
  const totalPending: number = reports.filter(
    (r) => r.status === "PENDING",
  ).length;
  const totalResolved: number = reports.filter(
    (r) => r.status === "RESOLVED",
  ).length;
  const totalDismissed: number = reports.filter(
    (r) => r.status === "DISMISSED",
  ).length;
  // Resolution rate = resolved / (resolved + dismissed) * 100
  const resolutionRate: number =
    totalResolved + totalDismissed > 0
      ? Number(
          ((totalResolved / (totalResolved + totalDismissed)) * 100).toFixed(2),
        )
      : 0;
  // Average time to resolution for resolved reports
  const timeToResolutionHours: number[] = reports
    .filter((r) => r.status === "RESOLVED")
    .map((r) => {
      const resolvedDate = r.updated_at;
      const createdAt = r.created_at;
      const hoursDiff =
        (resolvedDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      return hoursDiff;
    });
  const avgTimeToResolution: number | null =
    timeToResolutionHours.length > 0
      ? Number(
          (
            timeToResolutionHours.reduce((a, b) => a + b, 0) /
            timeToResolutionHours.length
          ).toFixed(2),
        )
      : null;
  // Reports by content type
  const postCount: number = reports.filter(
    (r) => r.reported_content_type === "POST",
  ).length;
  const commentCount: number = reports.filter(
    (r) => r.reported_content_type === "COMMENT",
  ).length;
  // Unique reporter count (anonymized)
  const uniqueReporterCount: number = Array.from(
    new Set(reports.map((r) => r.reporter.id)),
  ).length;
  // Build response records with aggregated metrics
  const data: IReportsAnalytic[] = reports.map((report) => ({
    startDate: toISOStringSafe(report.created_at).split("T")[0] as string &
      tags.Format<"date">,
    endDate: toISOStringSafe(report.created_at).split("T")[0] as string &
      tags.Format<"date">,
    status: report.status.toLowerCase() as "pending" | "resolved" | "dismissed",
    contentType: report.reported_content_type.toLowerCase() as
      | "post"
      | "comment",
    communityFilter: report.community.name,
  }));
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: total > 0 ? Math.ceil(total / limit) : 0,
  };
  return {
    pagination,
    data,
  };
}
