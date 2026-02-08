import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
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

export async function patchCommunityPlatformModeratorCommunityBannedUsers(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommunityBannedUser.IRequest;
}): Promise<IPageICommunityPlatformCommunityBannedUser.ISummary> {
  const page = 1;
  const limit = 50;
  const skip = 0;
  const where: Prisma.community_platform_community_banned_usersWhereInput = {};
  const orderBy: Prisma.community_platform_community_banned_usersOrderByWithRelationInput[] =
    [{ banned_at: "desc" }];
  const records =
    await MyGlobal.prisma.community_platform_community_banned_users.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        community_id: true,
        user_id: true,
        banned_at: true,
        unbanned_at: true,
        ban_reason: true,
        created_at: true,
        updated_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.community_platform_community_banned_users.count({
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
      community_id: record.community_id,
      user_id: record.user_id,
      banned_at: toISOStringSafe(record.banned_at),
      unbanned_at:
        record.unbanned_at === null
          ? null
          : toISOStringSafe(record.unbanned_at),
      ban_reason: record.ban_reason,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
