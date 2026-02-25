import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuestSessions(props: {
  guest: GuestPayload;
  body: ICommunityPlatformUserSession.IRequest;
}): Promise<IPageICommunityPlatformUserSession.ISummary> {
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  const now = new Date().toISOString();
  const where: Prisma.community_platform_user_sessionsWhereInput = {
    deleted_at: null,
    ...(props.body.userId ? { user_id: props.body.userId } : {}),
    ...(props.body.status === "active"
      ? { expired_at: { gt: now } }
      : props.body.status === "expired"
        ? { expired_at: { lte: now } }
        : {}),
    ...(props.body.createdAtFrom
      ? { created_at: { gte: props.body.createdAtFrom } }
      : {}),
    ...(props.body.createdAtTo
      ? { created_at: { lte: props.body.createdAtTo } }
      : {}),
    ...(props.body.expiresAtFrom
      ? { expired_at: { gte: props.body.expiresAtFrom } }
      : {}),
    ...(props.body.expiresAtTo
      ? { expired_at: { lte: props.body.expiresAtTo } }
      : {}),
  };
  const records =
    await MyGlobal.prisma.community_platform_user_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
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
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        deleted_at: true,
      },
    });
  const total = await MyGlobal.prisma.community_platform_user_sessions.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      user: {
        id: record.user.id,
        email: record.user.email,
        username: record.user.username,
        displayName: record.user.display_name,
        bio: record.user.bio === null ? undefined : record.user.bio,
        avatarUrl:
          record.user.avatar_url === null ? undefined : record.user.avatar_url,
        karma: record.user.karma,
        createdAt: toISOStringSafe(record.user.created_at),
        updatedAt: toISOStringSafe(record.user.updated_at),
        deletedAt:
          record.user.deleted_at === null
            ? null
            : toISOStringSafe(record.user.deleted_at),
      },
      ip: record.ip,
      href: record.href,
      referrer: record.referrer,
      createdAt: toISOStringSafe(record.created_at),
      expiredAt: toISOStringSafe(record.expired_at),
      deletedAt:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    })),
  };
}
