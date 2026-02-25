import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
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

export async function patchRedditCloneGuestAnalyticsPostsHot(props: {
  guest: GuestPayload;
  body: IRedditCloneContentPost.IRequest;
}): Promise<IPageIRedditCloneContentPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query posts with vote data and community/member relations
  const data = await MyGlobal.prisma.reddit_clone_content_posts.findMany({
    where: {
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: {
      vote_score: "desc",
      created_at: "desc",
    },
    select: {
      id: true,
      title: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      } satisfies Prisma.reddit_clone_membersFindManyArgs,
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
              avatar_url: true,
            },
          } satisfies Prisma.reddit_clone_ownersFindManyArgs,
        },
      } satisfies Prisma.reddit_clone_communitiesFindManyArgs,
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.reddit_clone_content_posts.count({
    where: {
      deleted_at: null,
    },
  });
  // Transform to summary format with computed analytics
  const transformedData = await Promise.all(
    data.map(async (post) => {
      // Compute time ago from created_at
      const timeAgo = computeTimeAgo(post.created_at);
      // Fetch vote data for accurate upvote/downvote counts
      const voteStats =
        await MyGlobal.prisma.reddit_clone_content_post_votes.groupBy({
          by: ["vote_value"],
          where: {
            post_id: post.id,
          },
          _count: {
            vote_value: true,
          },
        });
      // Calculate upvote and downvote counts from vote data
      let upvoteCount = 0;
      let downvoteCount = 0;
      for (const stat of voteStats) {
        if (stat.vote_value === 1) upvoteCount = stat._count.vote_value;
        else if (stat.vote_value === -1) downvoteCount = stat._count.vote_value;
      }
      // Compute engagement rate
      const totalVotes = upvoteCount + downvoteCount;
      const engagementRate = totalVotes > 0 ? (totalVotes / 1000) * 100 : 0;
      // Compute trending score (simplified热度 algorithm)
      const trendingScore = post.vote_score * 0.7 + totalVotes * 0.3;
      return {
        id: post.id,
        title: post.title,
        author: {
          id: post.author.id,
          username: post.author.username,
          displayName: post.author.display_name,
          avatarUrl: post.author.avatar_url,
        } satisfies IRedditCloneMember.ISummary,
        community: {
          id: post.community.id,
          name: post.community.name,
          description: post.community.description,
          iconUrl: post.community.icon_url,
          subscriberCount: post.community.subscriber_count,
          createdAt: post.community.created_at.toISOString(),
          owner: {
            id: post.community.owner.id,
            username: post.community.owner.username,
            displayName: post.community.owner.display_name,
            avatarUrl: post.community.owner.avatar_url,
          } satisfies IRedditCloneOwner.ISummary,
        } satisfies IRedditCloneCommunity.ISummary,
        voteScore: post.vote_score,
        commentCount: post.comment_count,
        viewCount: 0,
        upvoteCount,
        downvoteCount,
        timeAgo,
        trendingScore,
        engagementRate,
        created_at: post.created_at.toISOString(),
      } satisfies IRedditCloneContentPost.ISummary;
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditCloneContentPost.ISummary;
}
// Helper function to compute relative time
function computeTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (years > 0) return `${years}y ago`;
  if (months > 0) return `${months}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}
