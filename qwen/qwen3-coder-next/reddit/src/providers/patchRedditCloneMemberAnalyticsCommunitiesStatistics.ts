import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberAnalyticsCommunitiesStatistics(props: {
  member: MemberPayload;
  body: IRedditCloneCommunity.IAnalyticsRequest;
}): Promise<IPageIRedditCloneCommunity.IStatistic> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  // Build WHERE clause for filtering
  const where: Prisma.reddit_clone_communitiesWhereInput = {
    ...((props.body.search ?? props.body.search) !== undefined && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.minSubscribers !== undefined && {
      subscriber_count: { gte: props.body.minSubscribers },
    }),
    ...(props.body.maxSubscribers !== undefined && {
      subscriber_count: { lte: props.body.maxSubscribers },
    }),
  };
  // Build ORDER BY clause
  const orderBy: Prisma.reddit_clone_communitiesOrderByWithRelationInput =
    props.body.sortBy === "subscribers"
      ? { subscriber_count: props.body.sortOrder ?? "desc" }
      : props.body.sortBy === "posts"
        ? { posts: { _count: props.body.sortOrder ?? "desc" } }
        : props.body.sortBy === "comments"
          ? { posts: { _count: props.body.sortOrder ?? "desc" } }
          : props.body.sortBy === "votes"
            ? {
                posts: {
                  _count: props.body.sortOrder ?? "desc",
                },
              }
            : props.body.sortBy === "engagement"
              ? { subscriber_count: props.body.sortOrder ?? "desc" }
              : { created_at: props.body.sortOrder ?? "desc" };
  // Fetch communities with aggregations
  const data = await MyGlobal.prisma.reddit_clone_communities.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      name: true,
      description: true,
      icon_url: true,
      owner_id: true,
      subscriber_count: true,
      created_at: true,
      _count: {
        select: {
          posts: true,
        },
      },
      posts: {
        select: {
          _count: {
            select: {
              comments: true,
              postVotes: true,
            },
          },
        },
      },
    },
  });
  // Count total for pagination
  const total = await MyGlobal.prisma.reddit_clone_communities.count({ where });
  // Transform to statistics DTO
  const statistics: IRedditCloneCommunity.IStatistic[] = await Promise.all(
    data.map(async (community) => {
      // Fetch owner username
      const owner = await MyGlobal.prisma.reddit_clone_owners.findUnique({
        where: { id: community.owner_id },
        select: { username: true },
      });
      // Calculate comment count from posts
      let totalComments = 0;
      let totalVotes = 0;
      for (const post of community.posts) {
        totalComments += post._count.comments;
        totalVotes += post._count.postVotes;
      }
      // Calculate engagement rate
      const engagement_rate =
        community.subscriber_count > 0
          ? (totalVotes + totalComments) / community.subscriber_count
          : 0;
      // Calculate activity score (weighted combination) - simplified version without Date operations
      const activity_score =
        totalComments * 2 + totalVotes + community._count.posts;
      return {
        community: {
          id: community.id,
          name: community.name,
          description: community.description ?? "",
          icon_url: community.icon_url ?? "",
          owner_id: community.owner_id,
          owner_username: owner?.username ?? "unknown",
        },
        name: community.name,
        description: community.description ?? null,
        icon_url: community.icon_url ?? null,
        owner_id: community.owner_id,
        owner_username: owner?.username ?? "",
        subscriber_count: community.subscriber_count,
        post_count: community._count.posts,
        comment_count: totalComments,
        vote_count: totalVotes,
        engagement_rate: engagement_rate,
        activity_score: activity_score,
      };
    }),
  );
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    } satisfies IPage.IPagination,
    data: statistics,
  };
}
