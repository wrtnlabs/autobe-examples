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
export async function putRedditCommunityPlatformAdminReportsReportIdApprove(props: {
  platformAdmin: PlatformadminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReport> {
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        status: true,
        postReport: { select: { id: true } },
        commentReport: { select: { id: true } },
      },
    });
  if (report.status !== "pending") {
    throw new HttpException("Report is not pending", 400);
  }
  const now = toISOStringSafe(new Date());
  if (report.postReport) {
    await MyGlobal.prisma.reddit_community_posts.update({
      where: { id: report.postReport.id },
      data: {
        is_deleted: true,
        updated_at: now,
      },
    });
  } else if (report.commentReport) {
    await MyGlobal.prisma.reddit_community_comments.update({
      where: { id: report.commentReport.id },
      data: {
        is_deleted: true,
        updated_at: now,
      },
    });
  } else {
    throw new HttpException("Report target not found", 404);
  }
  await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: props.reportId },
    data: {
      status: "approved",
      resolved_by_user_id: props.platformAdmin.id,
      updated_at: now,
    },
  });
  const updatedReport =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCommunityReportTransformer.select(),
    });
  return await RedditCommunityReportTransformer.transform(updatedReport);
}
