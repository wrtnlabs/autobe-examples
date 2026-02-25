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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommunities(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null,
    ...(props.body.name ? { name: { contains: props.body.name } } : {}),
  } satisfies Prisma.community_platform_communitiesWhereInput;
  const sort = props.body.sort;
  type SortOrder = "asc" | "desc";
  const orderBy =
    sort === "old"
      ? { created_at: "asc" as SortOrder }
      : sort === "popular"
        ? { created_at: "desc" as SortOrder }
        : { created_at: "desc" as SortOrder };
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
    },
  });
  const total = await MyGlobal.prisma.community_platform_communities.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((community) => ({
      id: community.id,
      name: community.name,
      description: community.description,
      iconUrl: community.icon_url,
      subscriberCount: 0,
      ownerUser: {
        id: community.ownerUser.id,
        email: community.ownerUser.email,
        username: community.ownerUser.username,
        displayName: community.ownerUser.display_name,
        bio:
          community.ownerUser.bio === null
            ? undefined
            : community.ownerUser.bio,
        avatarUrl:
          community.ownerUser.avatar_url === null
            ? undefined
            : community.ownerUser.avatar_url,
        karma: community.ownerUser.karma,
        createdAt: toISOStringSafe(
          community.ownerUser.created_at ?? new Date(),
        ),
        updatedAt: toISOStringSafe(
          community.ownerUser.updated_at ?? new Date(),
        ),
        deletedAt: toISOStringSafe(
          community.ownerUser.deleted_at ?? new Date(),
        ),
      },
      createdAt: toISOStringSafe(community.created_at ?? new Date()),
      updatedAt: toISOStringSafe(community.updated_at ?? new Date()),
      deletedAt: toISOStringSafe(community.deleted_at ?? new Date()),
    })),
  };
}
