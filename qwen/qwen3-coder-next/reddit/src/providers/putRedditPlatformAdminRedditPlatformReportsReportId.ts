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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformAdminRedditPlatformReportsReportId(props: {
  admin: AdminPayload;
  reportId: string;
  body: IRedditPlatformReportResolution.IRequest;
}): Promise<IRedditPlatformReportResolution> {
  const report = await MyGlobal.prisma.reddit_platform_reports.findUnique({
    where: { id: props.reportId },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  if (report.status !== "PENDING") {
    throw new HttpException("Report already resolved", 400);
  }
  const created =
    await MyGlobal.prisma.reddit_platform_report_resolutions.create({
      data: {
        id: v4(),
        report_id: props.reportId,
        admin_id: props.admin.id,
        status: "RESOLVED",
        resolution_notes: props.body.resolution_notes,
        resolved_at: toISOStringSafe(new Date()),
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  const resolved = await MyGlobal.prisma.reddit_platform_reports.update({
    where: { id: props.reportId },
    data: { status: "APPROVED", resolved_at: created.resolved_at },
  });
  return {
    id: created.id,
    status: created.status,
    resolution_notes: created.resolution_notes ?? undefined,
    resolved_at: toISOStringSafe(created.resolved_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    admin_id: created.admin_id,
    report_id: created.report_id,
    admin: {
      id: props.admin.id,
      username: "",
      displayName: undefined,
      avatarUrl: undefined,
    },
    report: {
      id: report.id,
      reporter: {
        id: report.reporter_id,
        username: "",
        displayName: undefined,
        avatarUrl: undefined,
      },
      reported_type: report.reported_type,
      reported_id: report.reported_id,
      reason: report.reason,
      status: "RESOLVED",
      resolved_at: resolved.resolved_at
        ? toISOStringSafe(resolved.resolved_at)
        : null,
      created_at: toISOStringSafe(report.created_at),
    },
  };
}
