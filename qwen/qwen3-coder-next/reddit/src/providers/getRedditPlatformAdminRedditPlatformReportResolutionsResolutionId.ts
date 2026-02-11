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

export async function getRedditPlatformAdminRedditPlatformReportResolutionsResolutionId(props: {
  admin: AdminPayload;
  resolutionId: string;
}): Promise<IRedditPlatformReportResolution> {
  const resolution =
    await MyGlobal.prisma.reddit_platform_report_resolutions.findUnique({
      where: { id: props.resolutionId },
      include: {
        admin: true,
        report: {
          include: {
            reporter: true,
          },
        },
      },
    });
  if (!resolution) {
    throw new HttpException("Resolution not found", 404);
  }
  const resolved_at: string & tags.Format<"date-time"> =
    resolution.resolved_at.toISOString();
  const created_at: string & tags.Format<"date-time"> =
    resolution.created_at.toISOString();
  const updated_at: string & tags.Format<"date-time"> =
    resolution.updated_at.toISOString();
  const report_resolved_at: (string & tags.Format<"date-time">) | null =
    resolution.report.resolved_at === null
      ? null
      : resolution.report.resolved_at.toISOString();
  const report_created_at: string & tags.Format<"date-time"> =
    resolution.report.created_at.toISOString();
  return {
    id: resolution.id,
    status: resolution.status,
    resolution_notes: resolution.resolution_notes ?? undefined,
    resolved_at,
    created_at,
    updated_at,
    admin_id: resolution.admin_id,
    report_id: resolution.report_id,
    admin: {
      id: resolution.admin.id,
      username: resolution.admin.username,
      displayName: resolution.admin.display_name ?? undefined,
      avatarUrl: resolution.admin.avatar_url ?? undefined,
    },
    report: {
      id: resolution.report.id,
      reporter: {
        id: resolution.report.reporter.id,
        username: resolution.report.reporter.username,
        displayName: resolution.report.reporter.display_name ?? undefined,
        avatarUrl: resolution.report.reporter.avatar_url ?? undefined,
      },
      reported_type: resolution.report.reported_type,
      reported_id: resolution.report.reported_id,
      reason: resolution.report.reason,
      status: resolution.report.status,
      resolved_at: report_resolved_at,
      created_at: report_created_at,
    },
  };
}
