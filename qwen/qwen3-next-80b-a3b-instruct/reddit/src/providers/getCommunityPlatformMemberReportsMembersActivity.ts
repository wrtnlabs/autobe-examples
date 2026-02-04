import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageICommunityPlatformMemberActivitySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberActivitySummary";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformMemberActivitySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberActivitySummary";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getCommunityPlatformMemberReportsMembersActivity(props: {
  member: MemberPayload;
}): Promise<IPageICommunityPlatformMemberActivitySummary> {
  // Get total active members count for aggregation calculations
  const totalActiveMembers =
    await MyGlobal.prisma.community_platform_members.count({
      where: { deleted_at: null },
    });
  // Calculate average login frequency (sessions per member)
  const totalLoginSessions =
    await MyGlobal.prisma.community_platform_member_sessions.count();
  const averageLoginFrequency =
    totalActiveMembers > 0 ? totalLoginSessions / totalActiveMembers : 0;
  // Calculate average post engagement rate (upvotes per post)
  const totalPostUpvotes =
    await MyGlobal.prisma.community_platform_post_votes.count();
  const totalPosts = await MyGlobal.prisma.community_platform_posts.count();
  const averagePostEngagementRate =
    totalPosts > 0 ? totalPostUpvotes / totalPosts : 0;
  // Calculate average comment engagement rate (upvotes per comment)
  const totalCommentUpvotes =
    await MyGlobal.prisma.community_platform_comment_votes.count();
  const totalComments =
    await MyGlobal.prisma.community_platform_comments.count();
  const averageCommentEngagementRate =
    totalComments > 0 ? totalCommentUpvotes / totalComments : 0;
  // Calculate average community subscriptions (communities per member)
  const totalSubscriptions =
    await MyGlobal.prisma.community_platform_community_subscriptions.count();
  const averageCommunitySubscriptions =
    totalActiveMembers > 0 ? totalSubscriptions / totalActiveMembers : 0;
  // Create the single summary record since this is a platform-wide summary, not member-level report
  return {
    data: [
      {
        averageLoginFrequency: averageLoginFrequency,
        averagePostEngagementRate: averagePostEngagementRate,
        averageCommentEngagementRate: averageCommentEngagementRate,
        averageCommunitySubscriptions: averageCommunitySubscriptions,
      },
    ],
    pagination: {
      current: 1,
      limit: 1,
      records: 1,
      pages: 1,
    } satisfies IPage.IPagination,
  };
}
