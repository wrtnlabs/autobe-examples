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

export async function patchRedditLikeMemberCommunitiesCommunityNameFeed(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereClause = {
    community: {
      name: props.communityName,
    },
    deleted_at: null,
  } satisfies Prisma.reddit_like_postsWhereInput;
  const orderBy = (() => {
    switch (props.body.sort) {
      case "hot":
        return { score: "desc", created_at: "desc" };
      case "new":
        return { created_at: "desc" };
      case "top":
        return { score: "desc" };
      case "controversial":
        return { score: "desc", comment_count: "desc" };
      default:
        return { created_at: "desc" };
    }
  })() satisfies Prisma.reddit_like_postsOrderByWithRelationInput;
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_posts.findMany({
      where: whereClause,
      skip,
      take: limit + 1,
      orderBy,
      select: {
        id: true,
        title: true,
        author: {
          select: {
            id: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            icon_url: true,
            created_at: true,
          },
        },
        score: true,
        comment_count: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.reddit_like_posts.count({ where: whereClause }),
  ]);
  const formattedData: IRedditLikePost.ISummary[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    author: {
      id: post.author.id,
      entity_type: "post" as const,
      title: post.title,
      content: post.title,
      score: post.score,
      hit_count: 0,
      created_at: post.created_at.toISOString(),
    },
    community: {
      id: post.community.id,
      name: post.community.name,
      icon_url: post.community.icon_url,
      created_at: post.community.created_at.toISOString(),
    },
    score: post.score,
    comment_count: post.comment_count,
    created_at: post.created_at.toISOString(),
  }));
  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: formattedData,
  };
}
