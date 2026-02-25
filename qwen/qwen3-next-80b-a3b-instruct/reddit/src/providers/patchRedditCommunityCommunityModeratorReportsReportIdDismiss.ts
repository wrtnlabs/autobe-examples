import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { RedditCommunityReportTransformer } from "../transformers/RedditCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityModeratorReportsReportIdDismiss(props: {
  communityModerator: CommunitymoderatorPayload;
  reportId: string;
}): Promise<IRedditCommunityReport> {
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCommunityReportTransformer.select(),
    });
  // Validate the report is pending
  if (report.status !== "pending") {
    throw new HttpException("Report is not pending", 400);
  }
  // Determine which community the reported content belongs to
  let communityId: string | null = null;
  if (report.postReport) {
    // For post reports, get community_id from the associated post
    const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
      where: { id: report.postReport.id },
    });
    communityId = post?.community_id || null;
  } else if (report.commentReport) {
    // For comment reports, get community_id from the associated post via comment
    const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
      where: { id: report.commentReport.id },
    });
    if (comment?.post_id) {
      const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
        where: { id: comment.post_id },
      });
      communityId = post?.community_id || null;
    }
  }
  if (!communityId) {
    throw new HttpException("Report target has no associated community", 400);
  }
  // Verify user is moderator of this community or platform admin
  const isPlatformAdmin =
    props.communityModerator.type === "communityModerator";
  const isCommunityModerator =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        community_id: communityId,
        user_id: props.communityModerator.id,
      },
    });
  if (!isPlatformAdmin && !isCommunityModerator) {
    throw new HttpException(
      "Forbidden: Not authorized to dismiss this report",
      403,
    );
  }
  // Update report: mark as dismissed, record resolver, update timestamp
  const updated = await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      resolved_by_user_id: props.communityModerator.id,
      updated_at: toISOStringSafe(new Date()),
    },
    ...RedditCommunityReportTransformer.select(),
  });
  // Return transformed response
  return await RedditCommunityReportTransformer.transform(updated);
}
