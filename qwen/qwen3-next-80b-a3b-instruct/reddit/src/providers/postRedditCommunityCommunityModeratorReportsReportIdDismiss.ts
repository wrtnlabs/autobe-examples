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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postRedditCommunityCommunityModeratorReportsReportIdDismiss(props: {
  communityModerator: CommunitymoderatorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentReport> {
  const report =
    await MyGlobal.prisma.reddit_community_comment_reports.findUnique({
      where: { id: props.reportId },
      ...RedditCommunityCommentReportTransformer.select(),
    });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report is not in pending state", 400);
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const updatedReport =
    await MyGlobal.prisma.reddit_community_comment_reports.update({
      where: { id: props.reportId },
      data: {
        status: "dismissed",
        resolved_at: now,
        updated_at: now,
      },
      ...RedditCommunityCommentReportTransformer.select(),
    });
  await MyGlobal.prisma.reddit_community_moderation_actions.create({
    data: {
      action_type: "dismiss_report",
      target_type: "comment",
      actor_id: props.communityModerator.id,
      metadata: JSON.stringify({ report_id: props.reportId }),
      created_at: now,
      reddit_community_moderation_action_of_comments: {
        connect: { id: report.comment.id },
      },
    },
  });
  return RedditCommunityCommentReportTransformer.transform(updatedReport);
}
