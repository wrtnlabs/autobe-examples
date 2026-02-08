import { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
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
  const page: number & tags.Type<"int32"> & tags.Minimum<0> = 1;
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> = 100;
  const skip = (page - 1) * limit;
  const where = {};
  const data = await MyGlobal.prisma.community_platform_banned_users.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      banned_at: true,
      unbanned_at: true,
      reason: true,
      community_platform_user_id: true,
      community_platform_community_id: true,
    },
  });
  const total = await MyGlobal.prisma.community_platform_banned_users.count({
    where,
  });
  return {
    data: data.map((item) => ({
      banned_at: toISOStringSafe(item.banned_at),
      unbanned_at:
        item.unbanned_at === null ? null : toISOStringSafe(item.unbanned_at),
      reason: item.reason ?? null,
      user_id: item.community_platform_user_id,
      community_id: item.community_platform_community_id,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
