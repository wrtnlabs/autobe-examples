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

export async function patchCommunityPlatformAdminCommunitiesCommunityIdBannedUsersList(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBannedUser.IRequest;
}): Promise<IPageICommunityPlatformCommunityBannedUser.ISummary> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  const filters: Prisma.community_platform_community_banned_usersWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
  };
  const conditions: Prisma.community_platform_community_banned_usersWhereInput[] =
    [];
  if (props.body.banStatus === "banned") {
    conditions.push({ unbanned_at: null });
  } else if (props.body.banStatus === "unbanned") {
    conditions.push({ unbanned_at: { not: null } });
  }
  if (props.body.bannedAt !== undefined && props.body.bannedAt !== null) {
    conditions.push({ banned_at: { gte: props.body.bannedAt } });
  }
  if (props.body.unbannedAt !== undefined && props.body.unbannedAt !== null) {
    conditions.push({ unbanned_at: { gte: props.body.unbannedAt } });
  }
  if (props.body.search && props.body.search.trim().length > 0) {
    const search = props.body.search.trim();
    conditions.push({
      OR: [
        { ban_reason: { contains: search, mode: "insensitive" } },
        { user: { username: { contains: search, mode: "insensitive" } } },
      ],
    });
  }
  const where =
    conditions.length > 0 ? { ...filters, AND: conditions } : filters;
  const total =
    await MyGlobal.prisma.community_platform_community_banned_users.count({
      where,
    });
  const rawRecords =
    await MyGlobal.prisma.community_platform_community_banned_users.findMany({
      where,
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
      skip,
      take: limit,
      orderBy: { banned_at: "desc" },
    });
  const data = rawRecords.map((record) => ({
    id: record.id,
    bannedAt: toISOStringSafe(record.banned_at),
    unbannedAt:
      record.unbanned_at !== null ? toISOStringSafe(record.unbanned_at) : null,
    banReason: record.ban_reason,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    deletedAt:
      record.deleted_at !== null ? toISOStringSafe(record.deleted_at) : null,
    user: {
      id: record.user.id,
      email: record.user.email,
      username: record.user.username,
      displayName: record.user.display_name,
      bio: record.user.bio !== undefined ? record.user.bio : null,
      avatarUrl:
        record.user.avatar_url !== undefined ? record.user.avatar_url : null,
      karma: record.user.karma,
      createdAt: toISOStringSafe(record.user.created_at),
      updatedAt: toISOStringSafe(record.user.updated_at),
      deletedAt:
        record.user.deleted_at !== null
          ? toISOStringSafe(record.user.deleted_at)
          : null,
    },
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
