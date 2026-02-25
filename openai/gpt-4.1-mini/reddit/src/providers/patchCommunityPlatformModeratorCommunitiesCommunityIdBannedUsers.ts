import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBannedUser";
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

export async function patchCommunityPlatformModeratorCommunitiesCommunityIdBannedUsers(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBannedUser.IRequest;
}): Promise<IPageICommunityPlatformCommunityBannedUser.ISummary> {
  const isModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        community_moderator_id: props.moderator.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (isModerator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereClause: Prisma.community_platform_community_banned_usersWhereInput =
    {
      community_id: props.communityId,
      deleted_at: null,
    };
  if (props.body.banStatus === "banned") {
    whereClause.unbanned_at = null;
  } else if (props.body.banStatus === "unbanned") {
    whereClause.unbanned_at = { not: null };
  }
  if (props.body.bannedAt !== undefined && props.body.bannedAt !== null) {
    const bannedAtDate = new Date(props.body.bannedAt);
    whereClause.banned_at = { gte: bannedAtDate };
  }
  if (props.body.unbannedAt !== undefined && props.body.unbannedAt !== null) {
    const unbannedAtDate = new Date(props.body.unbannedAt);
    whereClause.unbanned_at = { gte: unbannedAtDate };
  }
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.trim() !== ""
  ) {
    whereClause.OR = [
      { user: { email: { contains: props.body.search, mode: "insensitive" } } },
      {
        user: {
          username: { contains: props.body.search, mode: "insensitive" },
        },
      },
      { ban_reason: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  const total =
    await MyGlobal.prisma.community_platform_community_banned_users.count({
      where: whereClause,
    });
  const records =
    await MyGlobal.prisma.community_platform_community_banned_users.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { banned_at: "desc" },
      select: {
        id: true,
        banned_at: true,
        unbanned_at: true,
        ban_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: records.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      bannedAt: toISOStringSafe(item.banned_at),
      unbannedAt:
        item.unbanned_at !== null ? toISOStringSafe(item.unbanned_at) : null,
      banReason: item.ban_reason,
      createdAt: toISOStringSafe(item.created_at),
      updatedAt: toISOStringSafe(item.updated_at),
      deletedAt:
        item.deleted_at !== null ? toISOStringSafe(item.deleted_at) : null,
      user: {
        id: item.user.id as string & tags.Format<"uuid">,
        email: item.user.email,
        username: item.user.username,
        displayName: item.user.display_name,
        bio: item.user.bio ?? null,
        avatarUrl: item.user.avatar_url ?? null,
        karma: item.user.karma,
        createdAt: toISOStringSafe(item.user.created_at),
        updatedAt: toISOStringSafe(item.user.updated_at),
        deletedAt:
          item.user.deleted_at !== null
            ? toISOStringSafe(item.user.deleted_at)
            : null,
      },
    })),
  };
}
