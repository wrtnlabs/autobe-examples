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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminCommunitiesCommunityIdBannedUsers(props: {
  admin: AdminPayload;
  communityId: string;
}): Promise<IPageIRedditPlatformBan.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const whereInput = {
    community_id: props.communityId,
    deleted_at: null,
  } satisfies Prisma.reddit_platform_bansWhereInput;
  const bans = await MyGlobal.prisma.reddit_platform_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          karma_score: true,
        },
      },
      bannedBy: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_platform_bans.count({
    where: whereInput,
  });
  const data = bans.map((ban) => {
    return {
      id: ban.id,
      community_id: ban.community_id,
      user_id: ban.user_id,
      banned_by_id: ban.banned_by_id,
      created_at: ban.created_at.toISOString() as string &
        tags.Format<"date-time">,
      expires_at: ban.expires_at
        ? (ban.expires_at.toISOString() as string & tags.Format<"date-time">)
        : null,
      deleted_at: ban.deleted_at
        ? (ban.deleted_at.toISOString() as string & tags.Format<"date-time">)
        : null,
      user: ban.user,
      banned_by: ban.bannedBy,
    };
  });
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
