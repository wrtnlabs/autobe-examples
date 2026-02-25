import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityAnalyticsPostsPopular(props: {
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Calculate time filter start date
  let createdAtGte: string | undefined;
  if (props.body.timeFilter) {
    const now = new Date();
    let start: Date;
    switch (props.body.timeFilter) {
      case "today":
        start = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        start = new Date(now.setDate(now.getDate() - now.getDay()));
        break;
      case "month":
        start = new Date(now.setDate(1));
        break;
      case "year":
        start = new Date(now.setMonth(0, 1));
        break;
      default: // 'all'
        start = new Date(0);
    }
    createdAtGte = toISOStringSafe(start);
  }
  // Define computed fields for sorting
  const orderBy: Prisma.reddit_community_postsOrderByWithRelationInput = {
    created_at: "desc",
  };
  // Query all posts with relationships in single query
  const data = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: {
      is_deleted: false,
      created_at: createdAtGte ? { gte: createdAtGte } : undefined,
    },
    orderBy: orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      author_id: true,
      community_id: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      updated_at: true,
      url: true,
      image_url: true,
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
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: {
      is_deleted: false,
      created_at: createdAtGte ? { gte: createdAtGte } : undefined,
    },
  });
  // Transform to ISummary with proper date format and no Date objects
  const transformedData = data.map((post: any) => {
    return {
      id: post.id as string & tags.Format<"uuid">,
      title: post.title,
      author: {
        id: post.author.id as string & tags.Format<"uuid">,
        username: post.author.username,
        display_name: post.author.display_name,
        bio: post.author.bio,
        avatar_url: post.author.avatar_url,
        karma_score: post.author.karma_score,
        created_at: toISOStringSafe(post.author.created_at) as string &
          tags.Format<"date-time">,
      } satisfies IRedditCommunityMember.ISummary,
      community: {
        id: post.community.id as string & tags.Format<"uuid">,
        name: post.community.name,
        description: post.community.description,
        icon_url: post.community.icon_url,
        subscriber_count: post.community.subscriber_count,
        created_at: toISOStringSafe(post.community.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(post.community.updated_at) as string &
          tags.Format<"date-time">,
      } satisfies IRedditCommunityCommunity.ISummary,
      voteScore: post.vote_score,
      commentCount: post.comment_count,
      createdAt: toISOStringSafe(post.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(post.updated_at) as string &
        tags.Format<"date-time">,
      url: post.url as (string & tags.Format<"uri">) | null | undefined,
      imageUrl: post.image_url as
        | (string & tags.Format<"uri">)
        | null
        | undefined,
    } satisfies IRedditCommunityPost.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditCommunityPost.ISummary;
}
