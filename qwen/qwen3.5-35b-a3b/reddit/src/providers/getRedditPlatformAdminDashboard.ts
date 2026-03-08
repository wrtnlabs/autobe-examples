import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformDashboard";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminDashboard(props: {
  admin: AdminPayload;
}): Promise<IRedditPlatformDashboard> {
  const nowDate = new Date();
  const pendingReportsData: IRedditPlatformReport.ISummary[] =
    await MyGlobal.prisma.reddit_platform_reports
      .findMany({
        where: {
          status: "PENDING",
        },
        include: {
          reporter: {
            select: { username: true },
          },
          community: {
            select: { name: true },
          },
        },
        orderBy: { created_at: "desc" },
      })
      .then(
        (reports) =>
          reports.map((report) => ({
            id: report.id,
            reporter_username: report.reporter.username,
            community_name: report.community.name,
            reported_content_type: report.reported_content_type,
            reported_content_id: report.reported_content_id,
            reason: report.reason,
            status: report.status,
            created_at: report.created_at.toISOString(),
            resolved_at: null,
          })) as IRedditPlatformReport.ISummary[],
      );
  const recentAuditLogsData: IRedditPlatformModerationAuditLog.ISummary[] =
    await MyGlobal.prisma.reddit_platform_moderation_audit_logs
      .findMany({
        take: 20,
        orderBy: { created_at: "desc" },
        include: {
          moderator: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
              karma_score: true,
              bio: true,
              created_at: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              description: true,
              icon_url: true,
              subscriber_count: true,
              owner_id: true,
              created_at: true,
              owner: {
                select: {
                  id: true,
                  username: true,
                  display_name: true,
                  avatar_url: true,
                  karma_score: true,
                  bio: true,
                  created_at: true,
                },
              },
            },
          },
        },
      })
      .then(
        (logs) =>
          logs.map((log) => ({
            id: log.id,
            actionType: log.action_type,
            moderator: {
              id: log.moderator.id,
              username: log.moderator.username,
              displayName: log.moderator.display_name,
              bio: log.moderator.bio,
              avatarUrl: log.moderator.avatar_url,
              karmaScore: log.moderator.karma_score,
              createdAt: log.moderator.created_at.toISOString(),
              subscriptionCount: 0,
            },
            community: {
              id: log.community.id,
              name: log.community.name,
              description: log.community.description,
              icon_url: log.community.icon_url,
              subscriber_count: log.community.subscriber_count,
              author: {
                id: log.community.owner.id,
                username: log.community.owner.username,
                displayName: log.community.owner.display_name,
                bio: log.community.owner.bio,
                avatarUrl: log.community.owner.avatar_url,
                karmaScore: log.community.owner.karma_score,
                createdAt: log.community.owner.created_at.toISOString(),
                subscriptionCount: 0,
              },
              created_at: log.community.created_at.toISOString(),
            },
            createdAt: log.created_at.toISOString(),
          })) as IRedditPlatformModerationAuditLog.ISummary[],
      );
  const communityStatsData: IRedditPlatformCommunity.ISummary[] =
    await MyGlobal.prisma.reddit_platform_communities
      .findMany({
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
              karma_score: true,
              bio: true,
              created_at: true,
            },
          },
          _count: {
            select: { posts: true },
          },
        },
      })
      .then(
        (communities) =>
          communities.map((community) => ({
            id: community.id,
            name: community.name,
            description: community.description,
            icon_url: community.icon_url,
            subscriber_count: community.subscriber_count,
            author: {
              id: community.owner.id,
              username: community.owner.username,
              displayName: community.owner.display_name,
              bio: community.owner.bio,
              avatarUrl: community.owner.avatar_url,
              karmaScore: community.owner.karma_score,
              createdAt: community.owner.created_at.toISOString(),
              subscriptionCount: 0,
            },
            created_at: community.created_at.toISOString(),
          })) as IRedditPlatformCommunity.ISummary[],
      );
  const activeBansData: IRedditPlatformCommunityBan.ISummary[] =
    await MyGlobal.prisma.reddit_platform_community_bans
      .findMany({
        where: {
          deleted_at: null,
          OR: [{ expires_at: null }, { expires_at: { gt: nowDate } }],
        },
        include: {
          community: {
            select: {
              id: true,
              name: true,
              description: true,
              icon_url: true,
              subscriber_count: true,
              owner_id: true,
              created_at: true,
              owner: {
                select: {
                  id: true,
                  username: true,
                  display_name: true,
                  avatar_url: true,
                  karma_score: true,
                  bio: true,
                  created_at: true,
                },
              },
            },
          },
          bannedUser: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
              karma_score: true,
              bio: true,
              created_at: true,
            },
          },
          bannedBy: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
              karma_score: true,
              bio: true,
              created_at: true,
            },
          },
        },
      })
      .then(
        (bans) =>
          bans.map((ban) => ({
            id: ban.id,
            user: {
              id: ban.bannedUser.id,
              username: ban.bannedUser.username,
              displayName: ban.bannedUser.display_name,
              bio: ban.bannedUser.bio,
              avatarUrl: ban.bannedUser.avatar_url,
              karmaScore: ban.bannedUser.karma_score,
              createdAt: ban.bannedUser.created_at.toISOString(),
              subscriptionCount: 0,
            },
            community: {
              id: ban.community.id,
              name: ban.community.name,
              description: ban.community.description,
              icon_url: ban.community.icon_url,
              subscriber_count: ban.community.subscriber_count,
              author: {
                id: ban.community.owner.id,
                username: ban.community.owner.username,
                displayName: ban.community.owner.display_name,
                bio: ban.community.owner.bio,
                avatarUrl: ban.community.owner.avatar_url,
                karmaScore: ban.community.owner.karma_score,
                createdAt: ban.community.owner.created_at.toISOString(),
                subscriptionCount: 0,
              },
              created_at: ban.community.created_at.toISOString(),
            },
            bannedBy: {
              id: ban.bannedBy.id,
              username: ban.bannedBy.username,
              displayName: ban.bannedBy.display_name,
              bio: ban.bannedBy.bio,
              avatarUrl: ban.bannedBy.avatar_url,
              karmaScore: ban.bannedBy.karma_score,
              createdAt: ban.bannedBy.created_at.toISOString(),
              subscriptionCount: 0,
            },
            createdAt: ban.created_at.toISOString(),
            expiresAt: ban.expires_at?.toISOString() ?? null,
            deletedAt: ban.deleted_at?.toISOString() ?? null,
            isActive:
              ban.deleted_at === null &&
              (ban.expires_at === null || ban.expires_at > nowDate),
          })) as IRedditPlatformCommunityBan.ISummary[],
      );
  return {
    pendingReports: pendingReportsData,
    recentActivity: recentAuditLogsData,
    communityStats: communityStatsData,
    activeBans: activeBansData,
  };
}
