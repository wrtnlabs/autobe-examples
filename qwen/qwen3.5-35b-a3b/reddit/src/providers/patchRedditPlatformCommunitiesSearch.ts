import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformCommunitiesSearch(props: {
  body: IRedditPlatformCommunity.IRequest;
}): Promise<IPageIRedditPlatformCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 20, 1), 100);
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.reddit_platform_communitiesWhereInput = {
    deleted_at: null,
    ...(props.body.name && { name: { contains: props.body.name } }),
    ...(props.body.minSubscribers !== undefined &&
    props.body.minSubscribers !== null
      ? { subscriber_count: { gte: props.body.minSubscribers } }
      : {}),
    ...(props.body.maxSubscribers !== undefined &&
    props.body.maxSubscribers !== null
      ? { subscriber_count: { lte: props.body.maxSubscribers } }
      : {}),
  };
  // Build ORDER BY
  const orderByInput: Prisma.reddit_platform_communitiesOrderByWithRelationInput =
    sortField === "name"
      ? { name: sortOrder }
      : sortField === "subscriber_count"
        ? { subscriber_count: sortOrder }
        : { created_at: sortOrder };
  // Query communities
  const data = await MyGlobal.prisma.reddit_platform_communities.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    include: {
      owner: true,
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_platform_communities.count({
    where: whereInput,
  });
  // Transform to response
  const transformedData = data.map((community) => {
    const author = {
      id: community.owner.id,
      username: community.owner.username,
      displayName: community.owner.display_name,
      bio: community.owner.bio ?? null,
      avatarUrl: community.owner.avatar_url ?? null,
      karmaScore: community.owner.karma_score,
      createdAt: community.owner.created_at.toISOString(),
      subscriptionCount: 0,
    } satisfies IRedditPlatformMember.ISummary;
    return {
      id: community.id,
      name: community.name,
      description: community.description ?? null,
      icon_url: community.icon_url ?? null,
      subscriber_count: community.subscriber_count,
      author,
      created_at: community.created_at.toISOString(),
    } satisfies IRedditPlatformCommunity.ISummary;
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
