import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunityAtSummaryTransformer } from "../transformers/RedditCloneCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneCommunities(props: {
  body: IRedditCloneCommunity.IRequest;
}): Promise<IPageIRedditCloneCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput = {
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.name && {
      name: { equals: props.body.name, mode: "insensitive" },
    }),
  } satisfies Prisma.reddit_clone_communitiesWhereInput;
  // Get sorting order
  const orderByInput =
    props.body.sort === "popularity"
      ? ({
          subscriber_count: "desc",
        } satisfies Prisma.reddit_clone_communitiesOrderByWithRelationInput)
      : props.body.sort === "newness"
        ? ({
            created_at: "desc",
          } satisfies Prisma.reddit_clone_communitiesOrderByWithRelationInput)
        : props.body.sort === "subscriberCount"
          ? ({
              subscriber_count: "desc",
            } satisfies Prisma.reddit_clone_communitiesOrderByWithRelationInput)
          : ({
              created_at: "desc",
            } satisfies Prisma.reddit_clone_communitiesOrderByWithRelationInput);
  // Execute queries sequentially
  const data = await MyGlobal.prisma.reddit_clone_communities.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      owner_id: true,
      name: true,
      description: true,
      icon_url: true,
      subscriber_count: true,
      created_at: true,
      updated_at: true,
      owner: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_communities.count({
    where: whereInput,
  });
  // Transform results using existing transformer
  const transformedData = await Promise.all(
    data.map(async (community) => {
      const communityData: any = {
        id: community.id,
        owner_id: community.owner_id,
        name: community.name,
        description: community.description,
        icon_url: community.icon_url,
        subscriber_count: community.subscriber_count,
        created_at: community.created_at,
        updated_at: community.updated_at,
        owner: community.owner
          ? {
              id: community.owner.id,
              username: community.owner.username,
              display_name: community.owner.display_name,
              avatar_url: community.owner.avatar_url,
            }
          : null,
      };
      return await RedditCloneCommunityAtSummaryTransformer.transform(
        communityData,
      );
    }),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
