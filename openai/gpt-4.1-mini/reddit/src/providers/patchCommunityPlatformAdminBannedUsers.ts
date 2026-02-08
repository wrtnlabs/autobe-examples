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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminBannedUsers(props: {
  admin: AdminPayload;
  body: ICommunityPlatformBannedUser.IRequest;
}): Promise<IPageICommunityPlatformBannedUser.ISummary> {
  // Default pagination values as props.body has no page or limit
  const page = 1;
  const limit = 100;
  const where: Prisma.community_platform_banned_usersWhereInput = {
    deleted_at: null,
  };
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_platform_banned_users.findMany({
    where,
    skip,
    take: limit,
    orderBy: { banned_at: "desc" },
  });
  const total = await MyGlobal.prisma.community_platform_banned_users.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      community_platform_user_id: record.community_platform_user_id,
      community_platform_community_id: record.community_platform_community_id,
      banned_at: toISOStringSafe(record.banned_at),
      unbanned_at:
        record.unbanned_at === null
          ? null
          : toISOStringSafe(record.unbanned_at),
      reason: record.reason,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    })),
  };
}
