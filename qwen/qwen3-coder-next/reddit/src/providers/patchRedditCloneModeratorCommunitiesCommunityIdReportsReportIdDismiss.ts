import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReportResolution";
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

export async function patchRedditCloneModeratorCommunitiesCommunityIdReportsReportIdDismiss(props: {
  moderator: ModeratorPayload;
  communityId: string;
  reportId: string;
}): Promise<IRedditCloneContentReportResolution> {
  const now = toISOStringSafe(new Date());
  const report =
    await MyGlobal.prisma.reddit_clone_content_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        status: true,
        comment_id: true,
        reporter_id: true,
        reason: true,
        created_at: true,
      },
    });
  if (report.status !== "pending") {
    throw new HttpException("Report is already resolved", 409);
  }
  const reportResolution =
    await MyGlobal.prisma.reddit_clone_content_report_resolutions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        report_id: props.reportId,
        moderator_id: props.moderator.id,
        reason: report.reason || "",
        action: "dismissed" as const,
        resolved_at: now,
        created_at: now,
        updated_at: now,
      },
      select: {
        id: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        reason: true,
      },
    });
  await MyGlobal.prisma.reddit_clone_content_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      updated_at: now,
    },
  });
  await MyGlobal.prisma.reddit_clone_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      moderator_id: props.moderator.id,
      post_id: null,
      comment_id: null,
      action_type: "dismiss_report",
      target_type: "content_report",
      reason: report.reason || "Report dismissed",
      created_at: now,
    },
  });
  return {
    id: reportResolution.id,
    reportId: props.reportId,
    moderatorId: props.moderator.id,
    reason: reportResolution.reason ?? null,
    resolvedAt: toISOStringSafe(reportResolution.resolved_at),
    createdAt: toISOStringSafe(reportResolution.created_at),
    updatedAt: toISOStringSafe(reportResolution.updated_at),
    action: "dismissed" as const,
  };
}
