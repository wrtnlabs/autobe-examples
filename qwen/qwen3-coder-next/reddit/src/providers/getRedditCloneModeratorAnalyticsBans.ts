import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneModeratorAnalyticsBans(props: {
  moderator: ModeratorPayload;
}): Promise<IRedditCloneCommunityBan> {
  const now = toISOStringSafe(new Date());
  const totalBans = await MyGlobal.prisma.reddit_clone_community_bans.count({
    where: { deleted_at: null },
  });
  const activeBans = await MyGlobal.prisma.reddit_clone_community_bans.count({
    where: {
      deleted_at: null,
      ban_start_date: { lte: now },
      OR: [{ ban_end_date: null }, { ban_end_date: { gte: now } }],
    },
  });
  const expiredBans = await MyGlobal.prisma.reddit_clone_community_bans.count({
    where: {
      deleted_at: null,
      ban_end_date: { not: null, lt: now },
    },
  });
  const appealStats = await MyGlobal.prisma.reddit_clone_community_bans.groupBy(
    {
      by: ["appeal_status"],
      where: { deleted_at: null },
      _count: { appeal_status: true },
    },
  );
  const temporaryBans = await MyGlobal.prisma.reddit_clone_community_bans.count(
    {
      where: {
        deleted_at: null,
        ban_end_date: { not: null },
      },
    },
  );
  const permanentBans = await MyGlobal.prisma.reddit_clone_community_bans.count(
    {
      where: {
        deleted_at: null,
        ban_end_date: null,
      },
    },
  );
  const banAppealsCount =
    appealStats.find((s) => s.appeal_status === "pending")?._count
      .appeal_status ?? 0;
  const appealApprovedCount =
    appealStats.find((s) => s.appeal_status === "approved")?._count
      .appeal_status ?? 0;
  const appealDeniedCount =
    appealStats.find((s) => s.appeal_status === "denied")?._count
      .appeal_status ?? 0;
  return {
    id: props.moderator.id,
    community: {
      id: props.moderator.id,
      name: "Analytics Overview",
      description: "Comprehensive ban analytics data",
      subscriberCount: totalBans,
      createdAt: now,
      owner: {
        id: props.moderator.id,
        username: "analytics",
        displayName: null,
        avatarUrl: null,
      },
    },
    user: {
      id: props.moderator.id,
      username: "moderator",
      displayName: null,
      avatarUrl: null,
    },
    moderator: {
      id: props.moderator.id,
      email: "analytics@system.com",
      username: "analytics",
      roleType: "system",
      permissions: 0,
      createdAt: now,
      lastLoginAt: now,
      updatedAt: now,
    },
    banReason: `Total: ${totalBans}, Active: ${activeBans}, Expired: ${expiredBans}, Temporary: ${temporaryBans}, Permanent: ${permanentBans}, Pending Appeals: ${banAppealsCount}, Approved: ${appealApprovedCount}, Denied: ${appealDeniedCount}`,
    banStartDate: now,
    banEndDate: null,
    appealStatus: banAppealsCount > 0 ? "pending" : "approved",
    createdAt: now,
    updatedAt: now,
  };
}
