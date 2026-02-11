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

export async function patchRedditPlatformMemberRedditPlatformReportsReportIdResolutions(props: {
  member: MemberPayload;
  reportId: string;
  body: IRedditPlatformReportResolution.IUpdate;
}): Promise<IRedditPlatformReportResolution> {
  // Find the report with reporter relation first
  const report = await MyGlobal.prisma.reddit_platform_reports.findUnique({
    where: { id: props.reportId },
    include: {
      reporter: true,
    },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Only PENDING reports can be resolved
  if (report.status !== "PENDING") {
    throw new HttpException("Report is no longer pending", 400);
  }
  const now = new Date();
  const nowString = toISOStringSafe(now);
  // Create the resolution record
  const resolution =
    await MyGlobal.prisma.reddit_platform_report_resolutions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        admin_id: props.member.id,
        report_id: props.reportId,
        status: props.body.status,
        resolution_notes: props.body.resolution_notes ?? null,
        resolved_at: nowString,
        created_at: nowString,
        updated_at: nowString,
      },
      include: {
        admin: true,
        report: true,
      },
    });
  // Update the original report status
  const updatedReport = await MyGlobal.prisma.reddit_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: props.body.status === "RESOLVED" ? "APPROVED" : "DISMISSED",
      resolved_at: nowString,
    },
  });
  // When RESOLVED, delete the reported content
  if (props.body.status === "RESOLVED") {
    if (report.reported_type === "POST") {
      await MyGlobal.prisma.reddit_platform_posts.delete({
        where: { id: report.reported_id },
      });
    } else if (report.reported_type === "COMMENT") {
      await MyGlobal.prisma.reddit_platform_comments.delete({
        where: { id: report.reported_id },
      });
    }
  }
  // Transform to response DTO
  return {
    id: resolution.id,
    status: resolution.status,
    resolution_notes:
      resolution.resolution_notes === null
        ? undefined
        : resolution.resolution_notes,
    resolved_at: resolution.resolved_at.toISOString(),
    created_at: resolution.created_at.toISOString(),
    updated_at: resolution.updated_at.toISOString(),
    admin_id: resolution.admin_id,
    report_id: resolution.report_id,
    admin: {
      id: resolution.admin.id,
      username: resolution.admin.username,
      displayName:
        resolution.admin.display_name === null
          ? undefined
          : resolution.admin.display_name,
      avatarUrl:
        resolution.admin.avatar_url === null
          ? undefined
          : resolution.admin.avatar_url,
    },
    report: {
      id: updatedReport.id,
      reporter: {
        id: report.reporter.id,
        username: report.reporter.username,
        displayName:
          report.reporter.display_name === null
            ? undefined
            : report.reporter.display_name,
        avatarUrl:
          report.reporter.avatar_url === null
            ? undefined
            : report.reporter.avatar_url,
      },
      reported_type: report.reported_type,
      reported_id: report.reported_id,
      reason: report.reason,
      status: updatedReport.status,
      resolved_at: updatedReport.resolved_at?.toISOString() ?? null,
      created_at: report.created_at.toISOString(),
    },
  };
}
