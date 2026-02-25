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
import { RedditCommunityCommentAtSummaryTransformer } from "../transformers/RedditCommunityCommentAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "../transformers/RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { RedditCommunityReportTransformer } from "../transformers/RedditCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPlatformAdminReportsReportIdDismiss(props: {
  platformAdmin: PlatformadminPayload;
  reportId: string;
}): Promise<IRedditCommunityReport> {
  const report = await MyGlobal.prisma.reddit_community_reports.findUnique({
    where: { id: props.reportId },
    select: {
      id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      reporter: RedditCommunityMemberAtSummaryTransformer.select(),
      resolver: RedditCommunityMemberAtSummaryTransformer.select(),
      postReport: RedditCommunityPostAtSummaryTransformer.select(),
      commentReport: RedditCommunityCommentAtSummaryTransformer.select(),
    },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report is not pending", 400);
  }
  await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      resolved_by_user_id: props.platformAdmin.id,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updatedReport =
    await MyGlobal.prisma.reddit_community_reports.findUnique({
      where: { id: props.reportId },
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reporter: RedditCommunityMemberAtSummaryTransformer.select(),
        resolver: RedditCommunityMemberAtSummaryTransformer.select(),
        postReport: RedditCommunityPostAtSummaryTransformer.select(),
        commentReport: RedditCommunityCommentAtSummaryTransformer.select(),
      },
    });
  if (!updatedReport) {
    throw new HttpException("Report not found after update", 500);
  }
  return RedditCommunityReportTransformer.transform(updatedReport);
}
