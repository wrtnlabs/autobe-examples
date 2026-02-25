import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPlatformAdmin";
import { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPlatformAdminPlatformAdmins(props: {
  platformAdmin: PlatformadminPayload;
  body: IRedditCommunityPlatformAdmin.IRequest;
}): Promise<IPageIRedditCommunityPlatformAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_community_platform_adminsWhereInput = {};
  if (props.body.username) {
    where.username = { contains: props.body.username, mode: "insensitive" };
  }
  if (props.body.email) {
    where.email = { contains: props.body.email, mode: "insensitive" };
  }
  if (props.body.is_deleted !== undefined) {
    where.is_deleted = props.body.is_deleted;
  }
  if (props.body.created_at) {
    where.created_at = {};
    if (props.body.created_at.gte) {
      where.created_at.gte = props.body.created_at.gte;
    }
    if (props.body.created_at.lte) {
      where.created_at.lte = props.body.created_at.lte;
    }
  }
  if (props.body.updated_at) {
    where.updated_at = {};
    if (props.body.updated_at.gte) {
      where.updated_at.gte = props.body.updated_at.gte;
    }
    if (props.body.updated_at.lte) {
      where.updated_at.lte = props.body.updated_at.lte;
    }
  }
  const data = await MyGlobal.prisma.reddit_community_platform_admins.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      email: true,
      password_hash: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      created_at: true,
      updated_at: true,
      is_deleted: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_community_platform_admins.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(data, async (item) => {
      return {
        id: item.id,
        email: item.email,
        username: item.username,
        display_name: item.display_name,
        bio: item.bio,
        avatar_url: item.avatar_url,
        karma_score: item.karma_score,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        is_deleted: item.is_deleted,
      };
    }),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
