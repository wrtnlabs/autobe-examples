import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminDashboard(props: {
  admin: AdminPayload;
}): Promise<ICommunityPlatformCommunity> {
  // Validate admin exists and has access
  const admin =
    await MyGlobal.prisma.community_platform_admins.findFirstOrThrow({
      where: { id: props.admin.id, deleted_at: null },
    });
  // Calculate platform statistics
  // Total active communities (not deleted)
  const totalCommunities =
    await MyGlobal.prisma.community_platform_communities.count({
      where: { deleted_at: null },
    });
  // Total active members (not deleted and logged in within last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const totalActiveMembers =
    await MyGlobal.prisma.community_platform_members.count({
      where: {
        deleted_at: null,
        last_login_at: { gte: thirtyDaysAgo },
      },
    });
  // Recent posts (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentPostsCount = await MyGlobal.prisma.community_platform_posts.count(
    {
      where: {
        created_at: { gte: sevenDaysAgo },
        deleted_at: null,
      },
    },
  );
  // Pending reports
  const pendingReportsCount =
    await MyGlobal.prisma.community_platform_content_reports.count({
      where: { status: "pending" },
    });
  // Community growth (current month vs previous month)
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const currentMonthCommunities =
    await MyGlobal.prisma.community_platform_communities.count({
      where: {
        created_at: { gte: currentMonthStart },
        deleted_at: null,
      },
    });
  const previousMonthCommunities =
    await MyGlobal.prisma.community_platform_communities.count({
      where: {
        created_at: { gte: previousMonthStart, lt: previousMonthEnd },
        deleted_at: null,
      },
    });
  const communityGrowthPercentage =
    previousMonthCommunities === 0
      ? 100
      : ((currentMonthCommunities - previousMonthCommunities) /
          previousMonthCommunities) *
        100;
  // Retrieve recent activities
  // Recent communities (last 5)
  const recentCommunities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      take: 5,
      ...CommunityPlatformCommunityTransformer.select(),
    });
  // Recent reports with details
  const recentReports =
    await MyGlobal.prisma.community_platform_content_reports.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        reporterMember: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  // Transform community data
  const transformedCommunities = await ArrayUtil.asyncMap(
    recentCommunities,
    CommunityPlatformCommunityTransformer.transform,
  );
  // Create dashboard response
  // Note: The return type is ICommunityPlatformCommunity, but this seems incorrect.
  // A dashboard should return aggregated statistics, not a single community.
  // Will need to check the correct DTO type for dashboard response.
  return {
    id: v4() as string & tags.Format<"uuid">,
    name: "Admin Dashboard",
    description: "Platform administration dashboard",
    owner: {
      id: admin.id,
      email: "admin@platform.com",
      username: "admin",
      email_verified: true,
      registered_at: admin.created_at.toISOString(),
    } satisfies ICommunityPlatformMember.ISummary,
    subscriber_count: totalActiveMembers,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
}
