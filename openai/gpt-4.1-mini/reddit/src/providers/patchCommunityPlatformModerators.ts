import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModerators(props: {
  body: ICommunityPlatformModerator.IRequest;
}): Promise<IPageICommunityPlatformModerator.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where = {};
  const moderatorRecords =
    await MyGlobal.prisma.community_platform_moderators.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
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
    });
  const totalRecords =
    await MyGlobal.prisma.community_platform_moderators.count({ where });
  const data = moderatorRecords.map((record) => ({
    id: record.id,
    email: record.email,
    username: record.username,
    display_name:
      record.display_name === null ? undefined : record.display_name,
    bio: record.bio === null ? undefined : record.bio,
    avatar_url: record.avatar_url === null ? undefined : record.avatar_url,
    karma: record.karma,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null
        ? undefined
        : toISOStringSafe(record.deleted_at),
  }));
  return {
    data: data,
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit),
    },
  };
}
