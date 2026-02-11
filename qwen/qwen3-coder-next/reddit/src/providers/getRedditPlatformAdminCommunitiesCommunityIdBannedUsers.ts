import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBan";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_platform_bans.findMany({
    where: {
      community_id: props.communityId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      reason: true,
      created_at: true,
      expired_at: true,
      user: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
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
    where: {
      community_id: props.communityId,
      deleted_at: null,
    },
  });
  const transformedData = data.map((ban) => ({
    id: ban.id as string & tags.Format<"uuid">,
    reason: ban.reason,
    created_at: toISOStringSafe(ban.created_at),
    expired_at: ban.expired_at ? toISOStringSafe(ban.expired_at) : null,
    user: {
      id: ban.user.id as string & tags.Format<"uuid">,
      username: ban.user.username,
      displayName:
        ban.user.display_name === null ? undefined : ban.user.display_name,
      avatarUrl: ban.user.avatar_url === null ? undefined : ban.user.avatar_url,
    },
    bannedBy: {
      id: ban.bannedBy.id as string & tags.Format<"uuid">,
      username: ban.bannedBy.username,
      displayName:
        ban.bannedBy.display_name === null
          ? undefined
          : ban.bannedBy.display_name,
      avatarUrl:
        ban.bannedBy.avatar_url === null ? undefined : ban.bannedBy.avatar_url,
    },
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData as IRedditPlatformBan.ISummary[],
  };
}
