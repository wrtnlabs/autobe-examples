import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
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

export async function patchCommunityPlatformUserCommunities(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  const where: Prisma.community_platform_communitiesWhereInput = {
    deleted_at: null,
    ...(props.body.name
      ? { name: { contains: props.body.name, mode: "insensitive" } }
      : {}),
  };
  let orderBy: Prisma.community_platform_communitiesOrderByWithRelationInput;
  if (props.body.sort === "new" || props.body.sort === undefined) {
    orderBy = { created_at: "desc" };
  } else if (props.body.sort === "old") {
    orderBy = { created_at: "asc" };
  } else {
    orderBy = { community_subscriptions: { _count: "desc" } } as any;
  }
  const total = await MyGlobal.prisma.community_platform_communities.count({
    where,
  });
  const data = await MyGlobal.prisma.community_platform_communities.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      name: true,
      description: true,
      icon_url: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      ownerUser: {
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
      community_subscriptions: { select: { id: true } },
    },
  });
  const communities: ICommunityPlatformCommunity.ISummary[] = data.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    iconUrl: c.icon_url,
    subscriberCount: c.community_subscriptions.length,
    ownerUser: {
      id: c.ownerUser.id,
      email: c.ownerUser.email,
      username: c.ownerUser.username,
      displayName: c.ownerUser.display_name,
      bio: c.ownerUser.bio ?? null,
      avatarUrl: c.ownerUser.avatar_url ?? null,
      karma: c.ownerUser.karma,
      createdAt: toISOStringSafe(c.ownerUser.created_at),
      updatedAt: toISOStringSafe(c.ownerUser.updated_at),
      deletedAt: c.ownerUser.deleted_at
        ? toISOStringSafe(c.ownerUser.deleted_at)
        : null,
    },
    createdAt: toISOStringSafe(c.created_at),
    updatedAt: toISOStringSafe(c.updated_at),
    deletedAt: c.deleted_at ? toISOStringSafe(c.deleted_at) : null,
  }));
  return {
    data: communities,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
