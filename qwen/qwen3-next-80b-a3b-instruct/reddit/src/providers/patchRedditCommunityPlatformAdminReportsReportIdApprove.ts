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
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { RedditCommunityReportTransformer } from "../transformers/RedditCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchRedditCommunityPlatformAdminReportsReportIdApprove(props: {
  platformAdmin: PlatformadminPayload;
  reportId: string;
}): Promise<IRedditCommunityReport> {
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        status: true,
        reporter: {
          select: {
            id: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma_score: true,
            created_at: true,
          },
        },
        resolver: {
          select: {
            id: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma_score: true,
            created_at: true,
          },
        },
        postReport: {
          select: {
            id: true,
          },
        },
        commentReport: {
          select: {
            id: true,
          },
        },
      },
    });
  if (report.status !== "pending") {
    throw new HttpException("Report already resolved", 400);
  }
  // Soft-delete target: post or comment
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  if (report.postReport) {
    await MyGlobal.prisma.reddit_community_posts.update({
      where: { id: report.postReport.id },
      data: { is_deleted: true },
    });
  } else if (report.commentReport) {
    await MyGlobal.prisma.reddit_community_comments.update({
      where: { id: report.commentReport.id },
      data: { deleted_at: now },
    });
  }
  // Update report status and resolver using full transformer select
  const updatedReport = await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: report.id },
    data: {
      status: "approved",
      resolved_by_user_id: props.platformAdmin.id,
      updated_at: now,
    },
    select: RedditCommunityReportTransformer.select(),
  });
  return RedditCommunityReportTransformer.transform(updatedReport);
}
