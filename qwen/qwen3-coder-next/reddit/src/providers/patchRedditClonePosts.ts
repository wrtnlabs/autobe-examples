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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePosts(props: {
  body: IRedditCloneContentPost.IRequest;
}): Promise<IPageIRedditCloneContentPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Base where clause - always filter out deleted posts
  const whereClause = {
    deleted_at: null,
  } satisfies Prisma.reddit_clone_content_postsWhereInput;
  // Determine order by based on sort parameter
  let orderBy: Prisma.reddit_clone_content_postsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "new":
      orderBy = { created_at: "desc" };
      break;
    case "top":
      orderBy = { vote_score: "desc" };
      break;
    case "controversial":
      orderBy = { vote_score: "desc" };
      break;
    case "hot":
    default:
      orderBy = { created_at: "desc" };
      break;
  }
  // Query posts with pagination
  const posts = await MyGlobal.prisma.reddit_clone_content_posts.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: orderBy,
    select: {
      id: true,
      title: true,
      type: true,
      content: true,
      image_url: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      updated_at: true,
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
          updated_at: true,
          owner: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
            },
          },
          subscriptionCommunities: true,
          redditCloneOwner: true,
          redditCloneCommunityModerators: true,
          redditCloneCommunityBans: true,
          posts: true,
          contentSubscriptionCommunities: true,
          redditCloneModeratorAssignments: true,
          redditCloneBanRecords: true,
        },
      },
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_clone_content_posts.count({
    where: whereClause,
  });
  // Transform posts to summary format
  const transformedPosts = posts.map((post) => ({
    id: post.id,
    title: post.title,
    author: {
      id: post.author.id,
      username: post.author.username,
      displayName: post.author.display_name,
      avatarUrl: post.author.avatar_url,
    },
    community: {
      id: post.community.id,
      name: post.community.name,
      description: post.community.description,
      iconUrl: post.community.icon_url,
      subscriberCount: post.community.subscriber_count,
      createdAt: post.community.created_at.toISOString() as string &
        tags.Format<"date-time">,
      owner: {
        id: post.community.owner.id,
        username: post.community.owner.username,
        displayName: post.community.owner.display_name,
        avatarUrl: post.community.owner.avatar_url,
      },
    },
    voteScore: post.vote_score,
    commentCount: post.comment_count,
    viewCount: 0,
    upvoteCount: 0,
    downvoteCount: 0,
    timeAgo: "",
    trendingScore: 0,
    engagementRate: 0,
    created_at: post.created_at.toISOString() as string &
      tags.Format<"date-time">,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedPosts,
  };
}
