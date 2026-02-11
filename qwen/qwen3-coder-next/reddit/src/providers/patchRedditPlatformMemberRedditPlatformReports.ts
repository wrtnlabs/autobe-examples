import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberRedditPlatformReports(props: {
  member: MemberPayload;
  body: IRedditPlatformReport.IRequest;
}): Promise<IPageIRedditPlatformReport> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  // Build where conditions
  const whereConditions: Prisma.reddit_platform_reportsWhereInput = {
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.reporterId && { reporter_id: props.body.reporterId }),
    ...(props.body.reportedType && { reported_type: props.body.reportedType }),
    ...(props.body.reportedId && { reported_id: props.body.reportedId }),
  };
  // Date range filters
  if (props.body.startDate) {
    whereConditions.created_at = whereConditions.created_at ?? {};
    if (
      typeof whereConditions.created_at === "object" &&
      whereConditions.created_at !== null
    ) {
      (whereConditions.created_at as Prisma.DateTimeFilter).gte =
        props.body.startDate;
    }
  }
  if (props.body.endDate) {
    whereConditions.created_at = whereConditions.created_at ?? {};
    if (
      typeof whereConditions.created_at === "object" &&
      whereConditions.created_at !== null
    ) {
      (whereConditions.created_at as Prisma.DateTimeFilter).lt =
        props.body.endDate;
    }
  }
  // Order by
  const orderBy = {
    created_at: props.body.sortOrder === "ASC" ? "asc" : "desc",
  } satisfies Prisma.reddit_platform_reportsOrderByWithRelationInput;
  // Fetch data
  const reports = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: whereConditions,
    skip,
    take: pageSize,
    orderBy,
    include: {
      reporter: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
    },
  });
  // Fetch total count
  const total = await MyGlobal.prisma.reddit_platform_reports.count({
    where: whereConditions,
  });
  // Transform to response DTO
  const data = reports.map((report) => ({
    id: report.id,
    reporterId: report.reporter_id,
    resolvedById: report.resolved_by_id,
    reportedType: typia.assert<"POST" | "COMMENT">(report.reported_type),
    reportedId: report.reported_id,
    reason: report.reason,
    status: report.status as "PENDING" | "APPROVED" | "DISMISSED",
    createdAt: toISOStringSafe(report.created_at),
    updatedAt: toISOStringSafe(report.updated_at),
    resolvedAt: report.resolved_at ? toISOStringSafe(report.resolved_at) : null,
    reporter: report.reporter,
    resolvedBy: null, // unresolved by default
  }));
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination,
    data,
  };
}
