import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { RedditCommunityCommentReportTransformer } from "../transformers/RedditCommunityCommentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityPlatformAdminReportsReportIdDismiss(props: {
  platformAdmin: PlatformadminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentReport> {
  // Verify report exists and is pending
  const report =
    await MyGlobal.prisma.reddit_community_comment_reports.findUnique({
      where: { id: props.reportId },
      select: { status: true },
    });
  if (!report) throw new HttpException("Report not found", 404);
  if (report.status !== "pending")
    throw new HttpException("Report is not pending", 400);
  // Update report status to dismissed and set resolved_at
  const updated = await MyGlobal.prisma.reddit_community_comment_reports.update(
    {
      where: { id: props.reportId },
      data: {
        status: "dismissed",
        resolved_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      ...RedditCommunityCommentReportTransformer.select(),
    },
  );
  // Log moderation action - target_type must be 'comment' since report is on a comment
  // but the specific report ID cannot be stored as target_id doesn't exist in schema
  await MyGlobal.prisma.reddit_community_moderation_actions.create({
    data: {
      id: v4(),
      actor_id: props.platformAdmin.id,
      action_type: "dismiss",
      target_type: "comment",
      reason: "Dismissing report as non-violating.",
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Return transformed report
  return RedditCommunityCommentReportTransformer.transform(updated);
}
