import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdminDashboard";
import { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function getCommunityBbsSystemAdminDashboardAdminOverview(props: {
  systemAdmin: SystemadminPayload;
}): Promise<ICommunityBbsAdminDashboard> {
  const { systemAdmin } = props;

  const now = toISOStringSafe(new Date());
  const sevenDaysAgo = toISOStringSafe(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );

  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "system_admin",
      actor_id: systemAdmin.id,
      entity: "dashboard",
      action: "read",
      payload: JSON.stringify({ endpoint: "admin-overview" }),
      created_at: now,
      updated_at: now,
    },
  });

  try {
    const dailyRows =
      await MyGlobal.prisma.mv_community_bbs_daily_stats.findMany({
        where: { day: { gte: sevenDaysAgo } },
        orderBy: { day: "desc" },
        take: 90,
      });

    let partial = false;

    let postsCount = dailyRows.reduce((s, r) => s + (r.posts_count ?? 0), 0);
    let commentsCount = dailyRows.reduce(
      (s, r) => s + (r.comments_count ?? 0),
      0,
    );
    let activeUsers = dailyRows.reduce((s, r) => s + (r.active_users ?? 0), 0);
    let newMembers = dailyRows.reduce((s, r) => s + (r.new_members ?? 0), 0);

    const scoreValues = (
      dailyRows.map((r) => r.avg_post_score) as Array<number | null>
    ).filter((v) => v !== null && v !== undefined) as number[];
    const avgPostScore = scoreValues.length
      ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
      : null;

    if (dailyRows.length === 0) {
      partial = true;
      postsCount = await MyGlobal.prisma.community_bbs_posts.count({
        where: { is_published: true, published_at: { gte: sevenDaysAgo } },
      });
      commentsCount = await MyGlobal.prisma.community_bbs_comments.count({
        where: { created_at: { gte: sevenDaysAgo } },
      });
      const recentMemberships =
        await MyGlobal.prisma.community_bbs_community_memberships.findMany({
          where: { created_at: { gte: sevenDaysAgo } },
          select: { community_member_id: true },
        });
      activeUsers = Array.from(
        new Set(recentMemberships.map((m) => m.community_member_id)),
      ).length;
    }

    const openReportsCount = await MyGlobal.prisma.community_bbs_reports.count({
      where: { status: "open" },
    });
    const highPriorityReportsCount =
      await MyGlobal.prisma.community_bbs_reports.count({
        where: { priority: { in: ["high", "critical"] }, status: "open" },
      });
    const pendingApprovalsCount =
      await MyGlobal.prisma.community_bbs_posts.count({
        where: { business_status: "pending_moderation" },
      });

    const reportGroups = await MyGlobal.prisma.community_bbs_reports.groupBy({
      by: ["target_id"],
      where: { target_type: "community", created_at: { gte: sevenDaysAgo } },
      _count: { _all: true },
      orderBy: { _count: { target_id: "desc" } },
      take: 10,
    });

    const topCommunityIds = reportGroups.map((g) => g.target_id);

    const topCommunitiesData = topCommunityIds.length
      ? await MyGlobal.prisma.community_bbs_communities.findMany({
          where: { id: { in: topCommunityIds } },
          include: { creator: true, community_bbs_community_settings: true },
        })
      : [];

    const topCommunities = reportGroups.map((g) => {
      const community = topCommunitiesData.find((c) => c.id === g.target_id)!;
      const reports_count = (
        g._count && typeof g._count === "object"
          ? ((g._count as any)._all ?? 0)
          : 0
      ) as number;
      return {
        id: community.id,
        name: community.name,
        slug: community.slug,
        reports_count,
        members_count: community.members_count,
        posts_count: community.posts_count,
        visibility: community.visibility as "public" | "restricted" | "private",
        created_at: toISOStringSafe(community.created_at),
        updated_at: toISOStringSafe(community.updated_at),
      };
    });

    const recentReports = await MyGlobal.prisma.community_bbs_reports.findMany({
      where: { priority: { in: ["high", "critical"] } },
      orderBy: { created_at: "desc" },
      take: 10,
    });
    const recentHighPriorityReports = recentReports.map((r) => ({
      id: r.id,
      target_type: r.target_type,
      target_id: r.target_id,
      reason_code: r.reason_code,
      priority: r.priority,
      status: r.status,
      created_at: toISOStringSafe(r.created_at),
      evidence_count: r.evidence_count,
      reporter_present: r.reporter_id !== null,
    }));

    const communityIds = Array.from(
      new Set(dailyRows.map((d) => d.community_id)),
    );
    const communities = communityIds.length
      ? await MyGlobal.prisma.community_bbs_communities.findMany({
          where: { id: { in: communityIds } },
          include: { creator: true, community_bbs_community_settings: true },
        })
      : [];

    const dailyStats = dailyRows.map((d) => {
      const community = communities.find((c) => c.id === d.community_id)!;
      const cs = community.community_bbs_community_settings as any;
      const settings = cs
        ? ({
            id: cs.id,
            created_at: cs.created_at
              ? toISOStringSafe(cs.created_at)
              : undefined,
            updated_at: cs.updated_at
              ? toISOStringSafe(cs.updated_at)
              : undefined,
            deleted_at: cs.deleted_at ? toISOStringSafe(cs.deleted_at) : null,
            community_id: cs.community_id,
            visibility: cs.visibility as "public" | "restricted" | "private",
            require_post_approval: cs.require_post_approval,
            max_images_per_post: cs.max_images_per_post,
            allowed_image_mime_types: cs.allowed_image_mime_types
              ? String(cs.allowed_image_mime_types).split(",")
              : undefined,
          } as ICommunityBbsCommunitySettings)
        : undefined;

      return {
        id: d.id,
        community: {
          id: community.id,
          name: community.name,
          slug: community.slug,
          description: community.description ?? null,
          creator: {
            id: community.creator.id,
            username: community.creator.username,
            display_name: community.creator.display_name ?? null,
            karma: community.creator.karma,
            created_at: toISOStringSafe(community.creator.created_at),
            updated_at: toISOStringSafe(community.creator.updated_at),
          },
          visibility: community.visibility as
            | "public"
            | "restricted"
            | "private",
          post_approval_required: community.post_approval_required,
          members_count: community.members_count,
          posts_count: community.posts_count,
          community_settings: settings,
          created_at: toISOStringSafe(community.created_at),
          updated_at: toISOStringSafe(community.updated_at),
          deleted_at: community.deleted_at
            ? toISOStringSafe(community.deleted_at)
            : null,
        },
        day: toISOStringSafe(d.day),
        postsCount: d.posts_count,
        commentsCount: d.comments_count,
        newMembers: d.new_members,
        activeUsers: d.active_users,
        avgPostScore: d.avg_post_score ?? null,
        created_at: toISOStringSafe(d.created_at),
      };
    });

    const result: ICommunityBbsAdminDashboard = {
      kpis: {
        periodStart: sevenDaysAgo,
        periodEnd: now,
        postsCount: Number(postsCount),
        commentsCount: Number(commentsCount),
        activeUsers: Number(activeUsers),
        newMembers: Number(newMembers),
        avgPostScore: avgPostScore ?? null,
      },
      moderationOverview: {
        openReportsCount: Number(openReportsCount),
        highPriorityReportsCount: Number(highPriorityReportsCount),
        pendingApprovalsCount: Number(pendingApprovalsCount),
      },
      topCommunitiesByReports: topCommunities,
      recentHighPriorityReports,
      dailyStats,
      partial,
      generatedAt: now,
    };

    return result;
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
