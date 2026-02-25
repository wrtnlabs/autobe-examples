import { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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

export async function patchCommunityPlatformModeratorBannedUsers(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformBannedUser.IRequest;
}): Promise<IPageICommunityPlatformBannedUser.ISummary> {
  if (
    props.body.page !== undefined &&
    (props.body.page < 1 || !Number.isInteger(props.body.page))
  ) {
    throw new HttpException("Invalid page number", 400);
  }
  if (
    props.body.limit !== undefined &&
    (props.body.limit < 1 ||
      props.body.limit > 100 ||
      !Number.isInteger(props.body.limit))
  ) {
    throw new HttpException("Invalid limit number", 400);
  }
  const whereConditions: Prisma.community_platform_banned_usersWhereInput = {
    deleted_at: null,
    ...(props.body.communityPlatformUserId !== undefined && {
      community_platform_user_id: props.body.communityPlatformUserId,
    }),
    ...(props.body.communityPlatformCommunityId !== undefined && {
      community_platform_community_id: props.body.communityPlatformCommunityId,
    }),
  };
  if (props.body.isBanned !== undefined) {
    whereConditions.unbanned_at = props.body.isBanned ? null : { not: null };
  }
  if (
    props.body.bannedAtFrom !== undefined ||
    props.body.bannedAtTo !== undefined
  ) {
    whereConditions.banned_at = {};
    if (props.body.bannedAtFrom !== undefined) {
      whereConditions.banned_at.gte = props.body.bannedAtFrom;
    }
    if (props.body.bannedAtTo !== undefined) {
      whereConditions.banned_at.lte = props.body.bannedAtTo;
    }
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_platform_banned_users.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { banned_at: "desc" },
    select: {
      id: true,
      banned_at: true,
      unbanned_at: true,
      reason: true,
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
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          owner_user_id: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.community_platform_banned_users.count({
    where: whereConditions,
  });
  const ownerUserIds = Array.from(
    new Set(data.map((item) => item.community.owner_user_id)),
  );
  const owners = await MyGlobal.prisma.community_platform_users.findMany({
    where: { id: { in: ownerUserIds } },
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
  });
  const ownerMap = new Map<string, (typeof owners)[0]>();
  owners.forEach((owner) => ownerMap.set(owner.id, owner));
  return {
    data: data.map((item) => ({
      id: item.id,
      bannedAt: toISOStringSafe(item.banned_at),
      unbannedAt: item.unbanned_at ? toISOStringSafe(item.unbanned_at) : null,
      reason: item.reason,
      createdAt: toISOStringSafe(item.created_at),
      updatedAt: toISOStringSafe(item.updated_at),
      deletedAt: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
      user: {
        id: item.user.id,
        email: item.user.email,
        username: item.user.username,
        displayName: item.user.display_name,
        bio: item.user.bio ?? null,
        avatarUrl: item.user.avatar_url ?? null,
        karma: item.user.karma,
        createdAt: toISOStringSafe(item.user.created_at),
        updatedAt: toISOStringSafe(item.user.updated_at),
        deletedAt: item.user.deleted_at
          ? toISOStringSafe(item.user.deleted_at)
          : null,
      } satisfies ICommunityPlatformUser.ISummary,
      community: {
        id: item.community.id,
        name: item.community.name,
        description: item.community.description,
        iconUrl: item.community.icon_url,
        subscriberCount: 0,
        ownerUser: (() => {
          const owner = ownerMap.get(item.community.owner_user_id);
          if (!owner) {
            return {
              id: "00000000-0000-0000-0000-000000000000",
              email: "",
              username: "",
              displayName: "",
              bio: null,
              avatarUrl: null,
              karma: 0,
              createdAt: "1970-01-01T00:00:00.000Z",
              updatedAt: "1970-01-01T00:00:00.000Z",
              deletedAt: null,
            };
          }
          return {
            id: owner.id,
            email: owner.email,
            username: owner.username,
            displayName: owner.display_name,
            bio: owner.bio ?? null,
            avatarUrl: owner.avatar_url ?? null,
            karma: owner.karma,
            createdAt: toISOStringSafe(owner.created_at),
            updatedAt: toISOStringSafe(owner.updated_at),
            deletedAt: owner.deleted_at
              ? toISOStringSafe(owner.deleted_at)
              : null,
          };
        })() as ICommunityPlatformUser.ISummary,
      } as ICommunityPlatformCommunity.ISummary,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
