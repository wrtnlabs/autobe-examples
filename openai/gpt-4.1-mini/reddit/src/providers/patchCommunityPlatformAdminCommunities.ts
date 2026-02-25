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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunities(props: {
  admin: AdminPayload;
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page =
    typeof props.body.page === "number" && props.body.page >= 1
      ? Math.floor(props.body.page)
      : 1;
  const limit =
    typeof props.body.limit === "number"
      ? Math.min(Math.max(Math.floor(props.body.limit), 1), 100)
      : 20;
  const where: {
    deleted_at: null;
    name?: Prisma.StringFilter;
  } = { deleted_at: null };
  if (typeof props.body.name === "string" && props.body.name.trim() !== "") {
    where.name = { contains: props.body.name.trim(), mode: "insensitive" };
  }
  let orderBy:
    | Prisma.Enumerable<Prisma.community_platform_communitiesOrderByWithRelationInput>
    | undefined;
  if (props.body.sort === "new") {
    orderBy = [{ created_at: "desc" }];
  } else if (props.body.sort === "old") {
    orderBy = [{ created_at: "asc" }];
  } else if (props.body.sort === "popular") {
    orderBy = undefined;
  } else {
    orderBy = [{ created_at: "desc" }];
  }
  const total = await MyGlobal.prisma.community_platform_communities.count({
    where,
  });
  const skip = (page - 1) * limit;
  const communities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: { ownerUser: true },
    });
  const communityIds = communities.map((c) => c.id);
  const subscriberCountsRaw =
    communityIds.length > 0
      ? await MyGlobal.prisma.community_platform_community_subscriptions.groupBy(
          {
            by: ["community_id"],
            where: { community_id: { in: communityIds }, deleted_at: null },
            _count: { community_id: true },
          },
        )
      : [];
  const subscriberCountMap = new Map<string, number>();
  for (const item of subscriberCountsRaw) {
    subscriberCountMap.set(item.community_id, item._count.community_id);
  }
  const toDateTimeString = (date: unknown): string | null => {
    if (typeof date === "string") return date;
    return null;
  };
  const data = communities.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    iconUrl: c.icon_url,
    subscriberCount: subscriberCountMap.get(c.id) ?? 0,
    ownerUser: {
      id: c.ownerUser.id,
      email: c.ownerUser.email,
      username: c.ownerUser.username,
      displayName: c.ownerUser.display_name,
      bio: c.ownerUser.bio ?? null,
      avatarUrl: c.ownerUser.avatar_url ?? null,
      karma: c.ownerUser.karma,
      createdAt: toDateTimeString(c.ownerUser.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toDateTimeString(c.ownerUser.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: toDateTimeString(c.ownerUser.deleted_at) as
        | (string & tags.Format<"date-time">)
        | null,
    },
    createdAt: toDateTimeString(c.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toDateTimeString(c.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt: toDateTimeString(c.deleted_at) as
      | (string & tags.Format<"date-time">)
      | null,
  }));
  if (props.body.sort === "popular") {
    data.sort((a, b) => b.subscriberCount - a.subscriberCount);
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
