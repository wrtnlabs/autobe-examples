import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
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

export async function getCommunityPlatformUserPostsFeedHome(props: {
  user: UserPayload;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const subscriptions =
    await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where: {
        user_id: props.user.id,
        deleted_at: null,
      },
      select: { community_id: true },
    });
  if (subscriptions.length === 0) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const subscribedCommunityIds = subscriptions.map((sub) => sub.community_id);
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: {
      community_id: { in: subscribedCommunityIds },
      deleted_at: null,
    },
    skip: skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      created_at: true,
      community_id: true,
      author_user_id: true,
    },
  });
  const totalCount = await MyGlobal.prisma.community_platform_posts.count({
    where: {
      community_id: { in: subscribedCommunityIds },
      deleted_at: null,
    },
  });
  const communityIdsSet = new Set(subscribedCommunityIds);
  for (const post of posts) {
    communityIdsSet.add(post.community_id);
  }
  const communityIds = Array.from(communityIdsSet);
  const communities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      where: { id: { in: communityIds } },
      select: { id: true, name: true },
    });
  const communityMap = new Map<
    string,
    {
      id: string;
      name: string;
    }
  >();
  for (const community of communities) {
    communityMap.set(community.id, community);
  }
  const authorUserIdsSet = new Set<string>();
  for (const post of posts) {
    if (post.author_user_id) authorUserIdsSet.add(post.author_user_id);
  }
  const authorUserIds = Array.from(authorUserIdsSet);
  const users = await MyGlobal.prisma.community_platform_users.findMany({
    where: { id: { in: authorUserIds } },
    select: { id: true, username: true },
  });
  const userMap = new Map<
    string,
    {
      id: string;
      username: string;
    }
  >();
  for (const user of users) {
    userMap.set(user.id, user);
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    data: posts.map((post) => {
      const community = communityMap.get(post.community_id);
      const author = post.author_user_id
        ? userMap.get(post.author_user_id)
        : null;
      return {
        id: post.id,
        title: post.title,
        created_at: toISOStringSafe(post.created_at),
        community_id: post.community_id,
        community_name: community?.name ?? "",
        author_id: author?.id ?? "",
        author_username: author?.username ?? "",
      };
    }),
  };
}
