import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function patchRedditPlatformModeratorReportsReportIdDismiss(props: {
  moderator: ModeratorPayload;
  reportId: string;
}): Promise<void> {
  // Find the report to ensure it exists and is in 'pending' status
  const report = await MyGlobal.prisma.reddit_platform_reports.findUnique({
    where: { id: props.reportId },
    select: { target_id: true, target_type: true, id: true, status: true },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report is not in pending status", 400);
  }
  // Check if the moderator has permission to dismiss reports for this community
  // We need to verify the moderator is assigned to the community where the report was made
  const reportTargetType = report.target_type; // 'post' or 'comment'
  let communityId: string | null = null;
  if (reportTargetType === "post") {
    const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
      where: { id: report.target_id },
      select: { community_id: true },
    });
    if (post) {
      communityId = post.community_id;
    }
  } else if (reportTargetType === "comment") {
    const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
      where: { id: report.target_id },
      select: { post: { select: { community_id: true } } },
    });
    if (comment && comment.post) {
      communityId = comment.post.community_id;
    }
  }
  if (!communityId) {
    throw new HttpException("Could not determine community for report", 400);
  }
  // Verify moderator has permission for this community
  // community_roles table doesn't have deleted_at field, so remove that condition
  const moderatorCommunityRole =
    await MyGlobal.prisma.reddit_platform_community_roles.findFirst({
      where: {
        user_id: props.moderator.id,
        community_id: communityId,
      },
    });
  if (!moderatorCommunityRole) {
    throw new HttpException(
      "Forbidden: Moderator does not have permission for this community",
      403,
    );
  }
  // Update report status to 'dismissed'
  await MyGlobal.prisma.reddit_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      resolved_by_id: props.moderator.id,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Create moderation log entry for the dismissal action
  const dismissedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_platform_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      moderator_id: props.moderator.id,
      community_id: communityId,
      action_type: "report_dismiss",
      action_description: "Report dismissed by moderator",
      context: `Report ${props.reportId} dismissed`,
      executed_at: dismissedAt,
      reversible: false,
      ip_address: null,
      metadata: JSON.stringify({ report_id: props.reportId }),
      before_snapshot: null,
      after_snapshot: null,
      auto_moderated: false,
      report_id: props.reportId,
    },
  });
}
