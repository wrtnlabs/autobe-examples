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

export async function postRedditCommunityCommunityModeratorCommunitiesCommunityIdReportsReportIdDismiss(props: {
  communityModerator: CommunitymoderatorPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentReport> {
  const report =
    await MyGlobal.prisma.reddit_community_comment_reports.findUnique({
      where: { id: props.reportId },
      select: {
        id: true,
        comment: { select: { id: true } },
        reporter: { select: { id: true } },
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        resolved_at: true,
      },
    });
  if (!report) throw new HttpException("Report not found", 404);
  if (report.comment.id !== props.communityId)
    throw new HttpException("Report does not belong to this community", 403);
  if (report.status === "dismissed")
    return await RedditCommunityCommentReportTransformer.transform(report);
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_community_comment_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      resolved_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.reddit_community_moderation_actions.create({
    data: {
      id: v4(),
      actor_id: props.communityModerator.id,
      target_type: "comment",
      action_type: "dismiss",
      reason: "Report dismissed by moderator",
      created_at: now,
    },
  });
  const finalReport =
    await MyGlobal.prisma.reddit_community_comment_reports.findUnique({
      where: { id: props.reportId },
      select: {
        id: true,
        comment: { select: { id: true } },
        reporter: { select: { id: true } },
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        resolved_at: true,
      },
    });
  if (!finalReport)
    throw new HttpException("Report not found after update", 404);
  return await RedditCommunityCommentReportTransformer.transform(finalReport);
}
