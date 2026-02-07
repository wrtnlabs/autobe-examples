import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityModeratorReports(props: {
  moderator: ModeratorPayload;
  body: ICommunityReport.IRequest;
}): Promise<IPageICommunityReport.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // ICommunityReport.IRequest is empty per schema, so we use defaults
  // and filter based only on active reporters
  const where: Prisma.community_reportsWhereInput = {};
  // Get all active reporter IDs from all actor tables
  const activeReporterIds: string[] = [];
  const guests = await MyGlobal.prisma.community_guests.findMany({
    where: { deleted_at: null },
    select: { id: true },
  });
  const members = await MyGlobal.prisma.community_members.findMany({
    where: { deleted_at: null },
    select: { id: true },
  });
  const moderators = await MyGlobal.prisma.community_moderators.findMany({
    where: { deleted_at: null },
    select: { id: true },
  });
  const admins = await MyGlobal.prisma.community_admins.findMany({
    where: { deleted_at: null },
    select: { id: true },
  });
  activeReporterIds.push(...guests.map((g) => g.id));
  activeReporterIds.push(...members.map((m) => m.id));
  activeReporterIds.push(...moderators.map((m) => m.id));
  activeReporterIds.push(...admins.map((a) => a.id));
  // If no active reporters, return empty result
  if (activeReporterIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Apply reporter_id filter using proper Prisma type handling
  where.reporter_id = { in: activeReporterIds };
  // Query reports
  const reports = await MyGlobal.prisma.community_reports.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
  });
  // Transform to summary
  const transformedReports: ICommunityReport.ISummary[] = reports.map(
    (report) => ({
      id: report.id,
      reporter_id: report.reporter_id,
      reported_content_id: report.reported_content_id,
      content_type: report.content_type,
      reason: report.reason,
      status: report.status,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
    }),
  );
  // Count total records
  const total = await MyGlobal.prisma.community_reports.count({
    where,
  });
  return {
    data: transformedReports,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
