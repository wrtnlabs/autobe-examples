import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformFeedsControversial(props: {
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const minControversialVotes = 10;
  const controversialScoreRange = 2;
  const startDate = props.body.start_date;
  const endDate = props.body.end_date;
  const baseWhereInput: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
    vote_score: {
      gte: -controversialScoreRange,
      lte: controversialScoreRange,
    },
    ...(startDate && { created_at: { gte: startDate } }),
    ...(endDate && { created_at: { lte: endDate } }),
  } satisfies Prisma.reddit_platform_postsWhereInput;
  const [posts, voteCounts, memberSubs] = await Promise.all([
    MyGlobal.prisma.reddit_platform_posts.findMany({
      where: baseWhereInput,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        post_type: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        deleted_at: true,
        author: {
          select: {
            id: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma_score: true,
            created_at: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            subscriber_count: true,
            created_at: true,
            owner: {
              select: {
                id: true,
                username: true,
                display_name: true,
                bio: true,
                avatar_url: true,
                karma_score: true,
                created_at: true,
              },
            },
          },
        },
      },
      orderBy: { vote_score: "asc" },
    }),
    MyGlobal.prisma.reddit_platform_post_votes.groupBy({
      by: ["post_id"],
      where: { deleted_at: null },
      _count: { id: true },
    }),
    MyGlobal.prisma.reddit_platform_community_subscriptions.groupBy({
      by: ["reddit_platform_member_id"],
      _count: { id: true },
    }),
  ]);
  const votesMap = new Map(voteCounts.map((v) => [v.post_id, v._count.id]));
  const subsMap = new Map(
    memberSubs.map((s) => [s.reddit_platform_member_id, s._count.id]),
  );
  const filteredPosts = posts.filter((post) => {
    const totalVotes = votesMap.get(post.id) ?? 0;
    return totalVotes >= minControversialVotes;
  });
  const total = filteredPosts.length;
  return {
    data: filteredPosts.map((post) => {
      const totalVotes = votesMap.get(post.id) ?? 0;
      const authorSubCount = subsMap.get(post.author.id) ?? 0;
      const communityOwnerSubCount = subsMap.get(post.community.owner.id) ?? 0;
      return {
        id: post.id,
        title: post.title,
        post_type: post.post_type,
        vote_score: post.vote_score,
        comment_count: post.comment_count,
        author: {
          id: post.author.id,
          username: post.author.username,
          displayName: post.author.display_name,
          bio: post.author.bio,
          avatarUrl: post.author.avatar_url,
          karmaScore: post.author.karma_score,
          createdAt: toISOStringSafe(post.author.created_at),
          subscriptionCount: authorSubCount,
        } satisfies IRedditPlatformMember.ISummary,
        community: {
          id: post.community.id,
          name: post.community.name,
          description: post.community.description,
          icon_url: post.community.icon_url,
          subscriber_count: post.community.subscriber_count,
          author: {
            id: post.community.owner.id,
            username: post.community.owner.username,
            displayName: post.community.owner.display_name,
            bio: post.community.owner.bio,
            avatarUrl: post.community.owner.avatar_url,
            karmaScore: post.community.owner.karma_score,
            createdAt: toISOStringSafe(post.community.owner.created_at),
            subscriptionCount: communityOwnerSubCount,
          } satisfies IRedditPlatformMember.ISummary,
          created_at: toISOStringSafe(post.community.created_at),
        } satisfies IRedditPlatformCommunity.ISummary,
        created_at: toISOStringSafe(post.created_at),
        deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
      } satisfies IRedditPlatformPost.ISummary;
    }),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
