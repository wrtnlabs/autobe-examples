import { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityPlatformAdminReportsReportIdResolution(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportResolution> {
  // For admin caller, allow access without community scoping.
  // Still, ensure the target report exists and is not soft-deleted.
  const report =
    await MyGlobal.prisma.community_platform_reports.findFirstOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const resolution =
    await MyGlobal.prisma.community_platform_report_resolutions.findFirst({
      where: {
        community_platform_report_id: report.id,
        deleted_at: null,
      },
      select: {
        id: true,
        community_platform_report_id: true,
        moderated_by_user_id: true,
        resolution_decision: true,
        moderation_note: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (resolution === null) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: resolution.id,
    communityPlatformReportId: resolution.community_platform_report_id,
    moderatedByUserId: resolution.moderated_by_user_id,
    resolutionDecision: resolution.resolution_decision,
    moderationNote: resolution.moderation_note,
    resolvedAt: resolution.resolved_at.toISOString(),
    createdAt: resolution.created_at.toISOString(),
    updatedAt: resolution.updated_at.toISOString(),
    deletedAt: resolution.deleted_at?.toISOString() ?? null,
  } satisfies ICommunityPlatformReportResolution;
}
