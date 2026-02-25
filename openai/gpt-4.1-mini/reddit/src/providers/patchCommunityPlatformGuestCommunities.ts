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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuestCommunities(props: {
  guest: GuestPayload;
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page =
    typeof props.body.page === "number" && props.body.page >= 1
      ? props.body.page
      : 1;
  const limit =
    typeof props.body.limit === "number" &&
    props.body.limit >= 1 &&
    props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  const where: Prisma.community_platform_communitiesWhereInput = {
    deleted_at: null,
    ...(typeof props.body.name === "string" && props.body.name.length > 0
      ? { name: { contains: props.body.name, mode: "insensitive" } }
      : {}),
  };
  const orderBy: Prisma.community_platform_communitiesOrderByWithRelationInput =
    props.body.sort === "old" ? { created_at: "asc" } : { created_at: "desc" };
  const totalCount = await MyGlobal.prisma.community_platform_communities.count(
    { where },
  );
  const communities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        ownerUser: true,
      },
    });
  return {
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: totalCount === 0 ? 0 : Math.ceil(totalCount / limit),
    },
    data: communities.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      iconUrl: c.icon_url,
      subscriberCount: 0,
      ownerUser: {
        id: c.ownerUser.id,
        email: c.ownerUser.email,
        username: c.ownerUser.username,
        displayName: c.ownerUser.display_name,
        bio: c.ownerUser.bio ?? null,
        avatarUrl: c.ownerUser.avatar_url ?? null,
        karma: c.ownerUser.karma,
        createdAt: toISOStringSafe(c.ownerUser.created_at) as string &
          tags.Format<"date-time">,
        updatedAt: toISOStringSafe(c.ownerUser.updated_at) as string &
          tags.Format<"date-time">,
        deletedAt: c.ownerUser.deleted_at
          ? toISOStringSafe(c.ownerUser.deleted_at)
          : null,
      },
      createdAt: toISOStringSafe(c.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(c.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: c.deleted_at ? toISOStringSafe(c.deleted_at) : null,
    })),
  };
}
