import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "../transformers/RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityReportTransformer } from "../transformers/RedditCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberReportsReportIdApprove(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReport> {
  // Step 1: Fetch the report to validate existence and get community_id
  const report = await MyGlobal.prisma.reddit_community_reports.findUnique({
    where: { id: props.reportId },
    select: {
      id: true,
      reporter_id: true,
      community_id: true,
      target_type: true,
      target_id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      reporter: RedditCommunityMemberAtSummaryTransformer.select(),
      community: RedditCommunityCommunityAtSummaryTransformer.select(),
      actionHistories: true,
      systemLogs: true,
    },
  });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  // Step 2: Validate report status is 'pending'
  if (report.status !== "pending") {
    throw new HttpException("Report is already resolved", 400);
  }
  // Step 3: Validate user is moderator of the report's community
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        reddit_community_community_id: report.community_id,
        reddit_community_moderator_id: props.member.id,
        deleted_at: null,
      },
    },
  );
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Update report status to 'approved'
  const updatedReport = await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: props.reportId },
    data: {
      status: "approved",
      updated_at: new Date(),
    },
    select: {
      id: true,
      reporter_id: true,
      community_id: true,
      target_type: true,
      target_id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      reporter: RedditCommunityMemberAtSummaryTransformer.select(),
      community: RedditCommunityCommunityAtSummaryTransformer.select(),
      actionHistories: true,
      systemLogs: true,
    },
  });
  // Step 5: Delete reported content based on target_type
  if (report.target_type === "post") {
    await MyGlobal.prisma.reddit_community_post_texts.delete({
      where: { id: report.target_id },
    });
  } else if (report.target_type === "comment") {
    await MyGlobal.prisma.reddit_community_comments.delete({
      where: { id: report.target_id },
    });
  }
  // Step 6: Return updated report using transformer
  return await RedditCommunityReportTransformer.transform(updatedReport);
}
