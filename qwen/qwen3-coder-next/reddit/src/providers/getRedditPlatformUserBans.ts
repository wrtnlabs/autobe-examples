import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBan";
import { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformUserBans(props: {
  user: UserPayload;
}): Promise<IPageIRedditPlatformBan.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const userRoles =
    await MyGlobal.prisma.reddit_platform_community_roles.findMany({
      where: {
        user_id: props.user.id,
      },
      select: {
        community_id: true,
      },
    });
  const userCommunityIds = userRoles.map((role) => role.community_id);
  const whereInput = {
    deleted_at: null,
    ...(userCommunityIds.length > 0
      ? {
          community_id: {
            in: userCommunityIds,
          },
        }
      : {}),
  } satisfies Prisma.reddit_platform_bansWhereInput;
  const data = await MyGlobal.prisma.reddit_platform_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      community_id: true,
      user_id: true,
      banned_by_id: true,
      created_at: true,
      expires_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_platform_bans.count({
    where: whereInput,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      community_id: record.community_id,
      user_id: record.user_id,
      banned_by_id: record.banned_by_id,
      created_at: toISOStringSafe(record.created_at),
      expires_at: record.expires_at ? toISOStringSafe(record.expires_at) : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
