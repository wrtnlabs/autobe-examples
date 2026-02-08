import { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBannedUser";
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

export async function getCommunityPlatformModeratorCommunityBannedUsers(props: {
  moderator: ModeratorPayload;
}): Promise<IPageICommunityPlatformBannedUser.ISummary> {
  const moderatorCommunities =
    await MyGlobal.prisma.community_platform_community_moderators.findMany({
      where: {
        community_moderator_id: props.moderator.id,
        deleted_at: null,
      },
      select: { community_id: true },
    });
  const communityIds: string[] = moderatorCommunities.map(
    (mc) => mc.community_id,
  );
  if (communityIds.length === 0) {
    return {
      pagination: { current: 1, limit: 100, records: 0, pages: 0 },
      data: [],
    };
  }
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const bannedUsersRaw =
    await MyGlobal.prisma.community_platform_banned_users.findMany({
      where: {
        community_platform_community_id: { in: communityIds },
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: { banned_at: "desc" },
      select: {
        id: true,
        banned_at: true,
        unbanned_at: true,
        reason: true,
        community_platform_user_id: true,
        community_platform_community_id: true,
      },
    });
  const total = await MyGlobal.prisma.community_platform_banned_users.count({
    where: {
      community_platform_community_id: { in: communityIds },
      deleted_at: null,
    },
  });
  const userIds: string[] = Array.from(
    new Set(bannedUsersRaw.map((bu) => bu.community_platform_user_id)),
  );
  const communityIdsFromBanned: string[] = Array.from(
    new Set(bannedUsersRaw.map((bu) => bu.community_platform_community_id)),
  );
  const users = await MyGlobal.prisma.community_platform_users.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_url: true,
    },
  });
  const communities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      where: { id: { in: communityIdsFromBanned } },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });
  const userMap = new Map(users.map((u) => [u.id, u]));
  const communityMap = new Map(communities.map((c) => [c.id, c]));
  const data: ICommunityPlatformBannedUser.ISummary[] = bannedUsersRaw.map(
    (bu) => {
      const user = userMap.get(bu.community_platform_user_id);
      const community = communityMap.get(bu.community_platform_community_id);
      return {
        id: bu.id,
        banned_at: toISOStringSafe(bu.banned_at),
        unbanned_at:
          bu.unbanned_at === null ? null : toISOStringSafe(bu.unbanned_at),
        reason: bu.reason,
        user: {
          id: user?.id ?? "",
          email: user?.email ?? "",
          display_name: user?.display_name ?? "",
          avatar_url: user?.avatar_url ?? null,
        },
        community: {
          id: community?.id ?? "",
          name: community?.name ?? "",
          description: community?.description ?? null,
        },
      };
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
