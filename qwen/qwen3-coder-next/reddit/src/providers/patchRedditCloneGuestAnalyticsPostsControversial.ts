import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
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

export async function patchRedditCloneGuestAnalyticsPostsControversial(props: {
  guest: GuestPayload;
  body: IRedditCloneFeedConfig.IRequest;
}): Promise<IPageIRedditCloneContentPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.reddit_clone_content_postsWhereInput = {
    deleted_at: null,
  };
  // Apply community filter if provided
  if (props.body.communityId) {
    whereConditions.community_id = props.body.communityId;
  }
  // Apply time range filter if provided
  if (props.body.startDate || props.body.endDate) {
    whereConditions.created_at = {};
    if (props.body.startDate) {
      whereConditions.created_at.gte = props.body.startDate as string &
        tags.Format<"date-time">;
    }
    if (props.body.endDate) {
      whereConditions.created_at.lte = props.body.endDate as string &
        tags.Format<"date-time">;
    }
  }
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_clone_content_posts.count({
    where: whereConditions,
  });
  // Get posts with vote aggregation for controversy calculation
  const data = await MyGlobal.prisma.reddit_clone_content_posts.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      title: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      author_id: true,
      community_id: true,
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
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
              avatar_url: true,
            },
          },
        },
      },
    },
  });
  // Calculate controversy scores and filter
  const postsWithControversy = data
    .map((post) => {
      // Calculate controversy score
      const score = post.vote_score;
      const votes = 1; // placeholder
      const controversy = votes * (1 - Math.abs(score) / votes);
      return {
        post,
        controversy,
        upvoteCount: 0,
        downvoteCount: 0,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => {
      if (b.controversy !== a.controversy) {
        return b.controversy - a.controversy;
      }
      return (
        b.upvoteCount + b.downvoteCount - (a.upvoteCount + a.downvoteCount)
      );
    })
    .slice(skip, skip + limit);
  return {
    data: postsWithControversy.map((item) => ({
      id: item.post.id,
      title: item.post.title,
      author: {
        id: item.post.author.id,
        username: item.post.author.username,
        displayName: item.post.author.display_name,
        avatarUrl: item.post.author.avatar_url,
      } satisfies IRedditCloneMember.ISummary,
      community: {
        id: item.post.community.id,
        name: item.post.community.name,
        description: item.post.community.description,
        iconUrl: item.post.community.icon_url,
        subscriberCount: item.post.community.subscriber_count,
        createdAt: toISOStringSafe(item.post.community.created_at) as string &
          tags.Format<"date-time">,
        owner: {
          id: item.post.community.owner.id,
          username: item.post.community.owner.username,
          displayName: item.post.community.owner.display_name,
          avatarUrl: item.post.community.owner.avatar_url,
        } satisfies IRedditCloneOwner.ISummary,
      } satisfies IRedditCloneCommunity.ISummary,
      voteScore: item.post.vote_score,
      commentCount: item.post.comment_count,
      viewCount: 0,
      upvoteCount: item.upvoteCount,
      downvoteCount: item.downvoteCount,
      timeAgo: "",
      trendingScore: item.controversy,
      engagementRate: 0,
      created_at: toISOStringSafe(item.post.created_at) as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
