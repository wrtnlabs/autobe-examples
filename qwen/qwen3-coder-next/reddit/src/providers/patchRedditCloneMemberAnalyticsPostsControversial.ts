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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberAnalyticsPostsControversial(props: {
  member: MemberPayload;
  body: IRedditCloneFeedConfig.IRequest;
}): Promise<IPageIRedditCloneContentPost> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const whereClause: Prisma.reddit_clone_content_postsWhereInput = {
    deleted_at: null,
  };
  // Initialize created_at to avoid spread error
  whereClause.created_at = {};
  // Add community filter if specified
  if (props.body.communityId) {
    whereClause.community_id = props.body.communityId;
  }
  // Add time range filter if specified
  if (props.body.startDate) {
    whereClause.created_at.gte = props.body.startDate as any;
  }
  if (props.body.endDate) {
    whereClause.created_at.lte = props.body.endDate as any;
  }
  // Fetch controversial posts
  const posts = await MyGlobal.prisma.reddit_clone_content_posts.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: [
      {
        created_at: "desc",
      },
    ],
    select: {
      id: true,
      title: true,
      created_at: true,
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
  // Compute total count for pagination
  const totalCount = await MyGlobal.prisma.reddit_clone_content_posts.count({
    where: whereClause,
  });
  // Transform posts to IRedditCloneContentPost with computed vote statistics
  const transformedPosts: IRedditCloneContentPost[] = posts.map((post) => {
    return {
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
        createdAt: toISOStringSafe(post.community.created_at),
        owner: {
          id: post.community.owner.id,
          username: post.community.owner.username,
          displayName: post.community.owner.display_name,
          avatarUrl: post.community.owner.avatar_url,
        },
      },
      vote_score: 0,
      comment_count: 0,
      created_at: toISOStringSafe(post.created_at),
    } satisfies IRedditCloneContentPost;
  });
  return {
    data: transformedPosts,
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCloneContentPost;
}
