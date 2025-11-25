import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAdminDashboard";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityBBSAdminDashboardOverview(props: {
  admin: AdminPayload;
}): Promise<ICommunityBBSAdminDashboard> {
  // The DTO ICommunityBBSAdminDashboard is defined as type string
  // This indicates the endpoint returns a JSON string representation of the dashboard
  // Rather than an object, we must return a JSON string

  const [
    totalUsers,
    newUsers24h,
    publishedPosts,
    pendingPosts,
    pendingReports,
    approvedReports,
    activeCommunities,
    suspendedCommunities,
    activeModerators,
    lastConfigUpdate,
    activeUsers7d,
  ] = await Promise.all([
    MyGlobal.prisma.community_bbs_citizen.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.community_bbs_citizen.count({
      where: {
        created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    MyGlobal.prisma.community_bbs_posts.count({
      where: { status: "published", deleted_at: null },
    }),
    MyGlobal.prisma.community_bbs_posts.count({ where: { status: "pending" } }),
    MyGlobal.prisma.community_bbs_reports.count({
      where: { status: "pending" },
    }),
    MyGlobal.prisma.community_bbs_reports.count({
      where: { status: "approved" },
    }),
    MyGlobal.prisma.community_bbs_communities.count({
      where: { status: "active", deleted_at: null },
    }),
    MyGlobal.prisma.community_bbs_communities.count({
      where: { status: "suspended", deleted_at: null },
    }),
    MyGlobal.prisma.community_bbs_moderator.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.community_bbs_system_config.findFirst({
      orderBy: { updated_at: "desc" },
      select: { updated_at: true },
    }),
    MyGlobal.prisma.community_bbs_user_activity_summary.count({
      where: {
        last_post_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const dashboard: any = {
    total_users: totalUsers,
    new_users_24h: newUsers24h,
    published_posts: publishedPosts,
    pending_posts: pendingPosts,
    pending_reports: pendingReports,
    approved_reports: approvedReports,
    active_communities: activeCommunities,
    suspended_communities: suspendedCommunities,
    active_moderators: activeModerators,
    last_config_update: lastConfigUpdate
      ? toISOStringSafe(lastConfigUpdate.updated_at)
      : null,
    active_users_7d: activeUsers7d,
  };

  return JSON.stringify(dashboard);
}
