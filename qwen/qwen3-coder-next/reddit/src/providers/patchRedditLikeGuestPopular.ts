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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchRedditLikeGuestPopular(props: {
  guest: GuestPayload;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_like_postsWhereInput = {
    deleted_at: null,
  };
  const orderBy: Prisma.reddit_like_postsOrderByWithRelationInput = {
    score: "desc",
    created_at: "desc",
  };
  const data = await MyGlobal.prisma.reddit_like_posts.findMany({
    where,
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
      score: true,
      comment_count: true,
      created_at: true,
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
          icon_url: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_like_posts.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      title: record.title,
      type: typia.assert<"text" | "link" | "image">(record.type),
      content: record.content,
      url: record.url,
      imageUrl: record.image_url,
      voteScore: record.score,
      commentCount: record.comment_count,
      createdAt: record.created_at.toISOString(),
      author: {
        id: record.author.id,
        username: record.author.username,
        display_name: record.author.display_name,
        bio: record.author.bio,
        avatar_url: record.author.avatar_url,
        karma_score: record.author.karma_score,
        created_at: record.author.created_at.toISOString(),
      },
      community: {
        name: record.community.name,
        icon_url: record.community.icon_url,
        subscriber_count: 0,
      },
    })),
  } satisfies IPageIRedditLikePost.ISummary;
}
