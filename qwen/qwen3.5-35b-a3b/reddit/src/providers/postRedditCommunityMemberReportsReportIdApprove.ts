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
  // Step 1: Validate user is a moderator of the report's community
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        reddit_community_moderator_id: props.member.id,
        deleted_at: null,
      },
    },
  );
  if (moderator === null || moderator.reddit_community_community_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Fetch the report by ID
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
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
      },
    });
  // Step 3: Validate report belongs to the moderator's community
  if (report.community_id !== moderator.reddit_community_community_id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Validate report status is 'pending'
  if (report.status !== "pending") {
    throw new HttpException("Bad Request", 400);
  }
  // Step 5: Approve the report
  const updatedReport = await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: props.reportId },
    data: {
      status: "approved",
      updated_at: new Date(),
    },
  });
  // Step 6: Delete the reported content based on target_type
  if (report.target_type === "post") {
    await MyGlobal.prisma.reddit_community_post_texts.delete({
      where: { id: report.target_id },
    });
  } else if (report.target_type === "comment") {
    await MyGlobal.prisma.reddit_community_comments.delete({
      where: { id: report.target_id },
    });
  }
  // Step 7: Fetch updated report with all required relations for transformer
  const updatedReportWithRelations =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
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
        systemLogs: true,
        actionHistories: true,
        reporter: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
      },
    });
  // Step 8: Return the updated report
  return await RedditCommunityReportTransformer.transform({
    ...updatedReportWithRelations,
    reporter: report.reporter,
    community: report.community,
  });
}
