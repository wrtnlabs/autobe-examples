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

export async function putRedditCommunityCommunityModeratorReportsReportIdApprove(props: {
  communityModerator: CommunitymoderatorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReport> {
  const report = await MyGlobal.prisma.reddit_community_reports.findUnique({
    where: { id: props.reportId },
    ...RedditCommunityReportTransformer.select(),
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report is not pending", 400);
  }
  const now = toISOStringSafe(new Date());
  // Soft delete target content
  if (report.postReport) {
    await MyGlobal.prisma.reddit_community_posts.update({
      where: { id: report.postReport.id },
      data: {
        deleted_at: now,
      } as Prisma.reddit_community_postsUncheckedUpdateInput,
    });
  } else if (report.commentReport) {
    await MyGlobal.prisma.reddit_community_comments.update({
      where: { id: report.commentReport.id },
      data: {
        deleted_at: now,
      } as Prisma.reddit_community_commentsUncheckedUpdateInput,
    });
  }
  // Update report status and resolver
  const updatedReport = await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: props.reportId },
    data: {
      status: "approved",
      resolved_by_user_id: props.communityModerator.id,
      updated_at: now,
    },
    ...RedditCommunityReportTransformer.select(),
  });
  return await RedditCommunityReportTransformer.transform(updatedReport);
}
