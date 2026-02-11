import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { RedditCommunityCommentReportTransformer } from "../transformers/RedditCommunityCommentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityCommunityModeratorCommunitiesCommunityIdReportsReportIdApprove(props: {
  communityModerator: CommunitymoderatorPayload;
  communityId: string;
  reportId: string;
}): Promise<IRedditCommunityCommentReport> {
  const report =
    await MyGlobal.prisma.reddit_community_comment_reports.findUnique({
      where: { id: props.reportId },
      select: {
        id: true,
        comment_id: true,
        reporter_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        resolved_at: true,
        comment: {
          select: { id: true },
        },
        reporter: {
          select: { id: true },
        },
      },
    });
  if (!report) throw new HttpException("Report not found", 404);
  // Verify report status is pending
  if (report.status !== "pending") {
    throw new HttpException("Report is not pending", 400);
  }
  const now = toISOStringSafe(new Date());
  // Update report status
  const updated = await MyGlobal.prisma.reddit_community_comment_reports.update(
    {
      where: { id: props.reportId },
      data: {
        status: "approved",
        resolved_at: now,
      },
    },
  );
  // Create moderation action for the target comment
  await MyGlobal.prisma.reddit_community_moderation_actions.create({
    data: {
      id: v4(),
      action_type: "REMOVE_COMMENT",
      actor_id: props.communityModerator.id,
      target_type: "comment",
      target_id: report.comment_id,
      reason: "Report approved by moderator",
      created_at: now,
    },
  });
  // Soft-delete the associated comment
  await MyGlobal.prisma.reddit_community_comment_reports.update({
    where: { id: report.comment_id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  return RedditCommunityCommentReportTransformer.transform(updated);
}
