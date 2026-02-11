import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
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

export async function postRedditPlatformMemberRedditPlatformReportResolutions(props: {
  member: MemberPayload;
  body: IRedditPlatformReportResolution.ICreate;
}): Promise<IRedditPlatformReportResolution> {
  // Find the report to validate it exists and get its current status
  const report = await MyGlobal.prisma.reddit_platform_reports.findUnique({
    where: { id: props.body.report_id },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Check if report is already resolved
  if (report.status === "APPROVED" || report.status === "DISMISSED") {
    throw new HttpException("Report already resolved", 400);
  }
  // Create the resolution record with proper date handling
  const resolution =
    await MyGlobal.prisma.reddit_platform_report_resolutions.create({
      data: {
        id: v4(),
        report_id: props.body.report_id,
        admin_id: props.member.id,
        status: props.body.status,
        resolution_notes: props.body.resolution_notes ?? null,
        resolved_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  // Update the report status and resolved_at
  await MyGlobal.prisma.reddit_platform_reports.update({
    where: { id: props.body.report_id },
    data: {
      status: props.body.status === "RESOLVED" ? "APPROVED" : "DISMISSED",
      resolved_at: resolution.resolved_at,
    },
  });
  // Fetch the admin summary
  const admin = await MyGlobal.prisma.reddit_platform_admins.findUnique({
    where: { id: props.member.id },
  });
  // Fetch the report details for the summary
  const reporter = await MyGlobal.prisma.reddit_platform_members.findUnique({
    where: { id: report.reporter_id },
  });
  // Transform the resolution record to the API response DTO
  const resolved_at = toISOStringSafe(resolution.resolved_at);
  return {
    id: resolution.id,
    status: resolution.status,
    resolution_notes: resolution.resolution_notes ?? undefined,
    resolved_at,
    created_at: toISOStringSafe(resolution.created_at),
    updated_at: toISOStringSafe(resolution.updated_at),
    admin_id: resolution.admin_id,
    report_id: resolution.report_id,
    admin: {
      id: admin?.id ?? props.member.id,
      username: admin?.username ?? "admin",
      displayName: admin?.display_name ?? null,
      avatarUrl: admin?.avatar_url ?? null,
    },
    report: {
      id: report.id,
      reporter: {
        id: reporter?.id ?? report.reporter_id,
        username: reporter?.username ?? "reporter",
        displayName: reporter?.display_name ?? null,
        avatarUrl: reporter?.avatar_url ?? null,
      },
      reported_type: report.reported_type,
      reported_id: report.reported_id,
      reason: report.reason,
      status: props.body.status === "RESOLVED" ? "APPROVED" : "DISMISSED",
      resolved_at,
      created_at: toISOStringSafe(report.created_at),
    },
  };
}
