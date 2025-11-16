import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityPopularStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityPopularStatistics";
import { IRedditCommunityPopularCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPopularCommunity";

export async function getRedditCommunityStatisticsCommunitiesPopular(): Promise<IRedditCommunityCommunityPopularStatistics> {
  const communities =
    await MyGlobal.prisma.reddit_community_communities.findMany({
      where: {
        deleted_at: null,
      },
      orderBy: [{ subscriber_count: "desc" }, { created_at: "asc" }],
    });

  if (communities.length === 0) {
    return {
      data: [],
    };
  }

  const communityIds = communities.map((c) => c.id);

  const [posts, allComments, allPostVotes, allCommentVotes] = await Promise.all(
    [
      MyGlobal.prisma.reddit_community_posts.findMany({
        where: {
          reddit_community_community_id: { in: communityIds },
          deleted_at: null,
        },
        select: {
          id: true,
          reddit_community_community_id: true,
        },
      }),
      MyGlobal.prisma.reddit_community_comments.findMany({
        where: {
          reddit_community_post_id: {
            in: await MyGlobal.prisma.reddit_community_posts
              .findMany({
                where: {
                  reddit_community_community_id: { in: communityIds },
                  deleted_at: null,
                },
                select: { id: true },
              })
              .then((p) => p.map((post) => post.id)),
          },
          deleted_at: null,
        },
        select: {
          id: true,
          reddit_community_post_id: true,
        },
      }),
      MyGlobal.prisma.reddit_community_post_votes.findMany({
        where: {
          reddit_community_post_id: {
            in: await MyGlobal.prisma.reddit_community_posts
              .findMany({
                where: {
                  reddit_community_community_id: { in: communityIds },
                  deleted_at: null,
                },
                select: { id: true },
              })
              .then((p) => p.map((post) => post.id)),
          },
        },
        select: {
          reddit_community_post_id: true,
        },
      }),
      MyGlobal.prisma.reddit_community_comment_votes.findMany({
        where: {
          reddit_community_comment_id: {
            in: await MyGlobal.prisma.reddit_community_comments
              .findMany({
                where: {
                  reddit_community_post_id: {
                    in: await MyGlobal.prisma.reddit_community_posts
                      .findMany({
                        where: {
                          reddit_community_community_id: { in: communityIds },
                          deleted_at: null,
                        },
                        select: { id: true },
                      })
                      .then((p) => p.map((post) => post.id)),
                  },
                  deleted_at: null,
                },
                select: { id: true },
              })
              .then((c) => c.map((comment) => comment.id)),
          },
        },
        select: {
          reddit_community_comment_id: true,
        },
      }),
    ],
  );

  const postsByCommunity = new Map<string, string[]>();
  for (const post of posts) {
    const existing =
      postsByCommunity.get(post.reddit_community_community_id) ?? [];
    existing.push(post.id);
    postsByCommunity.set(post.reddit_community_community_id, existing);
  }

  const commentsByPost = new Map<string, number>();
  for (const comment of allComments) {
    commentsByPost.set(
      comment.reddit_community_post_id,
      (commentsByPost.get(comment.reddit_community_post_id) ?? 0) + 1,
    );
  }

  const votesByPost = new Map<string, number>();
  for (const vote of allPostVotes) {
    votesByPost.set(
      vote.reddit_community_post_id,
      (votesByPost.get(vote.reddit_community_post_id) ?? 0) + 1,
    );
  }

  const votesByComment = new Map<string, number>();
  for (const vote of allCommentVotes) {
    votesByComment.set(
      vote.reddit_community_comment_id,
      (votesByComment.get(vote.reddit_community_comment_id) ?? 0) + 1,
    );
  }

  const communityStats = communities.map((community) => {
    const communityPostIds = postsByCommunity.get(community.id) ?? [];

    let totalComments = 0;
    let totalPostVotes = 0;
    for (const postId of communityPostIds) {
      totalComments += commentsByPost.get(postId) ?? 0;
      totalPostVotes += votesByPost.get(postId) ?? 0;
    }

    const communityCommentIds = allComments
      .filter((c) => communityPostIds.includes(c.reddit_community_post_id))
      .map((c) => c.id);

    let totalCommentVotes = 0;
    for (const commentId of communityCommentIds) {
      totalCommentVotes += votesByComment.get(commentId) ?? 0;
    }

    const totalEngagement = totalComments + totalPostVotes + totalCommentVotes;
    const engagementRate =
      community.subscriber_count > 0
        ? totalEngagement / community.subscriber_count
        : 0;

    const nowTime = Date.now();
    const createdTime = community.created_at.getTime();
    const ageInDays = Math.max(
      1,
      (nowTime - createdTime) / (1000 * 60 * 60 * 24),
    );

    const popularityScore =
      community.subscriber_count * 1.0 +
      community.post_count * 0.5 +
      engagementRate * 100 +
      Math.log(ageInDays) * 10;

    return {
      community,
      engagement_rate: engagementRate,
      popularity_score: popularityScore,
    };
  });

  const sortedStats = communityStats.sort(
    (a, b) => b.popularity_score - a.popularity_score,
  );

  const topCommunities = sortedStats.slice(0, 50);

  return {
    data: topCommunities.map((stat) => ({
      id: stat.community.id,
      name: stat.community.name,
      display_title: stat.community.display_title,
      description: stat.community.description,
      icon_url: stat.community.icon_url ?? undefined,
      banner_url: stat.community.banner_url ?? undefined,
      creator_member_id: stat.community.creator_member_id,
      subscriber_count: stat.community.subscriber_count,
      post_count: stat.community.post_count,
      engagement_rate: stat.engagement_rate,
      popularity_score: stat.popularity_score,
      created_at: toISOStringSafe(stat.community.created_at),
    })),
  };
}
