import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUsers(props: {
  body: ICommunityPlatformUser.IRequest;
}): Promise<IPageICommunityPlatformUser.ISummary> {
  const {
    email,
    username,
    displayName,
    karmaMin,
    karmaMax,
    page: rawPage,
    limit: rawLimit,
  } = props.body;
  const page = rawPage !== undefined && rawPage > 0 ? rawPage : 1;
  const limit =
    rawLimit !== undefined && rawLimit > 0 && rawLimit <= 100 ? rawLimit : 20;
  const where: Prisma.community_platform_usersWhereInput = {
    deleted_at: null,
    ...(email ? { email: { contains: email, mode: "insensitive" } } : {}),
    ...(username
      ? { username: { contains: username, mode: "insensitive" } }
      : {}),
    ...(displayName
      ? { display_name: { contains: displayName, mode: "insensitive" } }
      : {}),
    ...(karmaMin !== undefined ? { karma: { gte: karmaMin } } : {}),
    ...(karmaMax !== undefined ? { karma: { lte: karmaMax } } : {}),
  };
  const skip = (page - 1) * limit;
  const total = await MyGlobal.prisma.community_platform_users.count({ where });
  const users = await MyGlobal.prisma.community_platform_users.findMany({
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
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: users.map((user) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      bio: user.bio === null ? null : user.bio,
      avatarUrl: user.avatar_url === null ? null : user.avatar_url,
      karma: user.karma,
      createdAt: toISOStringSafe(user.created_at),
      updatedAt: toISOStringSafe(user.updated_at),
      deletedAt: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    })),
  };
}
