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

export async function patchRedditPlatformAdminReportsReportIdDismiss(props: {
  admin: AdminPayload;
  reportId: string;
}): Promise<void> {
  // Find the report first to verify existence and get current status
  const report = await MyGlobal.prisma.reddit_platform_reports.findUnique({
    where: { id: props.reportId },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Verify report is in pending status before dismissal
  if (report.status !== "pending") {
    throw new HttpException(
      `Report status is '${report.status}', only pending reports can be dismissed`,
      400,
    );
  }
  // Update report status to dismissed
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      resolved_by_id: props.admin.id,
      updated_at: now,
    },
  });
  // Determine community_id based on target_type and target_id
  let community_id: string | null = null;
  if (report.target_type === "post") {
    const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
      where: { id: report.target_id },
    });
    if (post) community_id = post.community_id;
  } else if (report.target_type === "comment") {
    const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
      where: { id: report.target_id },
    });
    if (comment) community_id = comment.community_id;
  }
  if (!community_id) {
    throw new HttpException("Could not determine community for report", 400);
  }
  // Log the dismissal action in moderation_logs table
  await MyGlobal.prisma.reddit_platform_moderation_logs.create({
    data: {
      id: v4(),
      moderator_id: props.admin.id,
      community_id: community_id,
      report_id: report.id,
      action_type: "report_dismiss",
      action_description: `Report ${report.id} dismissed by ${props.admin.id}`,
      context: JSON.stringify({
        report_status: report.status,
        reporter_id: report.reporter_id,
        resolved_by: props.admin.id,
        new_status: "dismissed",
      }),
      executed_at: now,
      reversible: false,
      auto_moderated: false,
    },
  });
}
