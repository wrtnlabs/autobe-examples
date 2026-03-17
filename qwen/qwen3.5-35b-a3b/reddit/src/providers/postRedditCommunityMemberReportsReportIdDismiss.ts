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

export async function postRedditCommunityMemberReportsReportIdDismiss(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReport> {
  // Query the report with nested relations and verify it exists with pending status
  const existingReport =
    await MyGlobal.prisma.reddit_community_reports.findFirst({
      where: {
        id: props.reportId,
        status: "pending",
        deleted_at: null,
      },
      select: {
        id: true,
        reporter_id: true,
        community_id: true,
        status: true,
      },
    });
  if (existingReport === null) {
    throw new HttpException("Report not found or already resolved", 404);
  }
  // Verify the requesting member is a moderator of the community
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        reddit_community_moderator_id: props.member.id,
        community: { id: existingReport.community_id },
        deleted_at: null,
      },
    },
  );
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Update the report status to dismissed
  const updatedReport = await MyGlobal.prisma.reddit_community_reports.update({
    where: {
      id: props.reportId,
    },
    data: {
      status: "dismissed",
      updated_at: new Date(),
    },
    select: {
      id: true,
      reporter: RedditCommunityMemberAtSummaryTransformer.select(),
      community: RedditCommunityCommunityAtSummaryTransformer.select(),
      target_type: true,
      target_id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      systemLogs: true,
      actionHistories: true,
    },
  });
  // Transform and return the updated report
  return await RedditCommunityReportTransformer.transform(updatedReport);
}
