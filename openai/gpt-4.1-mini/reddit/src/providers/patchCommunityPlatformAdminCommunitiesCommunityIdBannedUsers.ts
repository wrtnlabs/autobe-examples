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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdBannedUsers(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBannedUser.IRequest;
}): Promise<IPageICommunityPlatformCommunityBannedUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.community_platform_community_banned_usersWhereInput =
    {
      community_id: props.communityId,
      deleted_at: null,
    };
  if (props.body.banStatus) {
    if (props.body.banStatus === "banned") {
      whereConditions.unbanned_at = { equals: undefined };
      whereConditions.banned_at = { not: { equals: undefined } };
    } else if (props.body.banStatus === "unbanned") {
      whereConditions.unbanned_at = { not: { equals: undefined } };
    }
  }
  if (props.body.bannedAt !== undefined) {
    if (props.body.bannedAt === null) {
      whereConditions.banned_at = { equals: undefined };
    } else {
      whereConditions.banned_at = { gte: props.body.bannedAt };
    }
  }
  if (props.body.unbannedAt !== undefined) {
    if (props.body.unbannedAt === null) {
      whereConditions.unbanned_at = { equals: undefined };
    } else {
      whereConditions.unbanned_at = { gte: props.body.unbannedAt };
    }
  }
  if (props.body.search) {
    whereConditions.user = {
      OR: [
        { username: { contains: props.body.search, mode: "insensitive" } },
        { email: { contains: props.body.search, mode: "insensitive" } },
      ],
    };
  }
  const dataRecords =
    await MyGlobal.prisma.community_platform_community_banned_users.findMany({
      where: whereConditions,
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
  const total =
    await MyGlobal.prisma.community_platform_community_banned_users.count({
      where: whereConditions,
    });
  const resultData: ICommunityPlatformCommunityBannedUser.ISummary[] =
    dataRecords.map((item) => ({
      id: item.id,
      bannedAt: toISOStringSafe(item.banned_at) as string &
        tags.Format<"date-time">,
      unbannedAt: item.unbanned_at
        ? (toISOStringSafe(item.unbanned_at) as string &
            tags.Format<"date-time">)
        : null,
      banReason: item.ban_reason,
      createdAt: toISOStringSafe(item.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(item.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: item.deleted_at
        ? (toISOStringSafe(item.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
      user: {
        id: item.user.id,
        email: item.user.email,
        username: item.user.username,
        displayName: item.user.display_name,
        bio: item.user.bio ?? null,
        avatarUrl: item.user.avatar_url ?? null,
        karma: item.user.karma,
        createdAt: toISOStringSafe(item.user.created_at) as string &
          tags.Format<"date-time">,
        updatedAt: toISOStringSafe(item.user.updated_at) as string &
          tags.Format<"date-time">,
        deletedAt: item.user.deleted_at
          ? (toISOStringSafe(item.user.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
      },
    }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: resultData,
  };
}
