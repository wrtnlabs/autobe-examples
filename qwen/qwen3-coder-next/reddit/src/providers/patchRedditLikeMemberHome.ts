import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
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

export async function patchRedditLikeMemberHome(props: {
  member: MemberPayload;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const page = (props.body.page ?? 1) satisfies number as number;
  const limit = (props.body.limit ?? 100) satisfies number as number;
  const skip = (page - 1) * limit;
  // Build where clause to get posts from subscribed communities
  const whereClause: Prisma.reddit_like_postsWhereInput = {
    deleted_at: null,
    community: {
      subscriptions: {
        some: {
          member: {
            id: props.member.id,
          },
          status: "subscribed",
        },
      },
    },
  };
  // Build orderBy - default to newest
  const orderBy: Prisma.reddit_like_postsOrderByWithRelationInput = {
    created_at: "desc",
  };
  const data = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      title: true,
      type: true,
      content: true,
      url: true,
      image_url: true,
      author_id: true,
      community_id: true,
      score: true,
      comment_count: true,
      created_at: true,
      community: {
        select: {
          id: true,
          name: true,
          icon_url: true,
        },
      },
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
    },
  });
  const total = await MyGlobal.prisma.reddit_like_posts.count({
    where: whereClause,
  });
  const result = {
    pagination: {
      current: page satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: data.map((post) => ({
      id: post.id as string & tags.Format<"uuid">,
      title: post.title,
      type: post.type as "text" | "link" | "image",
      content: post.content,
      url: post.url,
      imageUrl: post.image_url,
      author: {
        id: post.author.id as string & tags.Format<"uuid">,
        username: post.author.username,
        display_name: post.author.display_name,
        bio: post.author.bio,
        avatar_url: post.author.avatar_url,
        karma_score: post.author.karma_score satisfies number &
          tags.Type<"int32">,
        created_at: post.author.created_at.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IRedditLikeMember.ISummary,
      community: {
        name: post.community.name,
        icon_url: post.community.icon_url,
        subscriber_count: 0 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      } satisfies IRedditLikeCommunity.ISummary,
      voteScore: post.score satisfies number & tags.Type<"int32">,
      commentCount: post.comment_count satisfies number & tags.Type<"int32">,
      createdAt: post.created_at.toISOString() as string &
        tags.Format<"date-time">,
    })),
  } satisfies IPageIRedditLikePost.ISummary;
  return result;
}
