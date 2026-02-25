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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminBannedUsers(props: {
  admin: AdminPayload;
  body: ICommunityPlatformBannedUser.IRequest;
}): Promise<IPageICommunityPlatformBannedUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.community_platform_banned_usersWhereInput = {
    deleted_at: null,
    ...(props.body.communityPlatformUserId && {
      community_platform_user_id: props.body.communityPlatformUserId,
    }),
    ...(props.body.communityPlatformCommunityId && {
      community_platform_community_id: props.body.communityPlatformCommunityId,
    }),
    ...(props.body.isBanned === true && {
      unbanned_at: null,
    }),
    ...(props.body.isBanned === false && {
      NOT: { unbanned_at: null },
    }),
    ...(props.body.bannedAtFrom && {
      banned_at: { gte: props.body.bannedAtFrom },
    }),
    ...(props.body.bannedAtTo && {
      banned_at: { lte: props.body.bannedAtTo },
    }),
  };
  const total = await MyGlobal.prisma.community_platform_banned_users.count({
    where,
  });
  const records =
    await MyGlobal.prisma.community_platform_banned_users.findMany({
      where,
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
          },
        },
      },
    });
  const toISO = (
    value: Date | string | null | undefined,
  ): (string & tags.Format<"date-time">) | null => {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) {
      return toISOStringSafe(value);
    }
    return toISOStringSafe(value);
  };
  // Dummy minimal ICommunityPlatformUser.ISummary as fallback for ownerUser, avoiding undefined/null
  const dummyOwnerUser: ICommunityPlatformUser.ISummary = {
    id: "",
    email: "",
    username: "",
    displayName: "",
    bio: undefined,
    avatarUrl: undefined,
    karma: 0,
    createdAt: toISO(new Date())!,
    updatedAt: toISO(new Date())!,
    deletedAt: null,
  };
  const data = records.map((record) => ({
    id: record.id,
    bannedAt: toISO(record.banned_at)!,
    unbannedAt: toISO(record.unbanned_at),
    reason: record.reason,
    createdAt: toISO(record.created_at)!,
    updatedAt: toISO(record.updated_at)!,
    deletedAt: toISO(record.deleted_at),
    user: {
      id: record.user.id,
      email: record.user.email,
      username: record.user.username,
      displayName: record.user.display_name,
      bio: record.user.bio === null ? undefined : record.user.bio,
      avatarUrl:
        record.user.avatar_url === null ? undefined : record.user.avatar_url,
      karma: record.user.karma,
      createdAt: toISO(record.user.created_at)!,
      updatedAt: toISO(record.user.updated_at)!,
      deletedAt: toISO(record.user.deleted_at),
    } satisfies ICommunityPlatformUser.ISummary,
    community: {
      id: record.community.id,
      name: record.community.name,
      description: record.community.description,
      iconUrl: record.community.icon_url,
      subscriberCount: 0,
      ownerUser: dummyOwnerUser,
      createdAt: toISO(record.community.created_at)!,
      updatedAt: toISO(record.community.updated_at)!,
      deletedAt: toISO(record.community.deleted_at),
    } satisfies ICommunityPlatformCommunity.ISummary,
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
