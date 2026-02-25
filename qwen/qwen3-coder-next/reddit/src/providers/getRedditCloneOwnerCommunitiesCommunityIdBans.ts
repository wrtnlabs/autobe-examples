import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityBan";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneOwnerCommunitiesCommunityIdBans(props: {
  owner: OwnerPayload;
  communityId: string;
}): Promise<IPageIRedditCloneCommunityBan.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_clone_community_bans.findMany({
    where: {
      community_id: props.communityId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { ban_start_date: "desc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
      moderator: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          email: true,
          role_type: true,
          permissions: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_community_bans.count({
    where: { community_id: props.communityId, deleted_at: null },
  });
  return {
    data: data.map((ban) => ({
      id: ban.id,
      user: {
        id: ban.user.id,
        username: ban.user.username,
        displayName: ban.user.display_name ?? undefined,
        avatarUrl: ban.user.avatar_url ?? undefined,
      },
      moderator: {
        id: ban.moderator.id,
        username: ban.moderator.username,
        displayName: ban.moderator.display_name ?? undefined,
        avatarUrl: ban.moderator.avatar_url ?? undefined,
        email: ban.moderator.email ?? undefined,
        roleType: ban.moderator.role_type ?? undefined,
        permissions: ban.moderator.permissions ?? undefined,
        createdAt: toISOStringSafe(ban.moderator.created_at),
        updatedAt: toISOStringSafe(ban.moderator.updated_at),
      },
      banReason: ban.ban_reason,
      banStartDate: toISOStringSafe(ban.ban_start_date),
      banEndDate: ban.ban_end_date
        ? toISOStringSafe(ban.ban_end_date)
        : undefined,
      appealStatus: ban.appeal_status as "pending" | "approved" | "denied",
      createdAt: toISOStringSafe(ban.created_at),
      updatedAt: toISOStringSafe(ban.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
