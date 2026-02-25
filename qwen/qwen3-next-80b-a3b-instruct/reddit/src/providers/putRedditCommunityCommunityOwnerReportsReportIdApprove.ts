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
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { RedditCommunityReportTransformer } from "../transformers/RedditCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityCommunityOwnerReportsReportIdApprove(props: {
  communityOwner: CommunityownerPayload;
  reportId: string;
  body: IRedditCommunityReport.IRequest;
}): Promise<IRedditCommunityReport> {
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCommunityReportTransformer.select(),
    });
  if (report.status !== "pending") {
    throw new HttpException("Report is not pending", 400);
  }
  const isPostTarget = report.postReport !== null;
  const isCommentTarget = report.commentReport !== null;
  if (!isPostTarget && !isCommentTarget) {
    throw new HttpException("Report target missing", 400);
  }
  // Transactionally update report and delete target
  const updatedReport = await MyGlobal.prisma.$transaction(async (prisma) => {
    const now = new Date().toISOString() as string & tags.Format<"date-time">;
    // Update report status and resolver
    await prisma.reddit_community_reports.update({
      where: { id: props.reportId },
      data: {
        status: "approved",
        resolved_by_user_id: props.communityOwner.id,
        updated_at: now,
      },
    });
    // Delete target content: post or comment
    if (isPostTarget) {
      await prisma.reddit_community_posts.update({
        where: { id: report.postReport!.id },
        data: { is_deleted: true },
      });
    } else if (isCommentTarget) {
      await prisma.reddit_community_comments.update({
        where: { id: report.commentReport!.id },
        data: { deleted_at: now },
      });
    }
    // Re-fetch full report with updated state
    return prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCommunityReportTransformer.select(),
    });
  });
  return await RedditCommunityReportTransformer.transform(updatedReport);
}
