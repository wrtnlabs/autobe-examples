import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { RedditLikeCommunityAtSummaryTransformer } from "../transformers/RedditLikeCommunityAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "../transformers/RedditLikeMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeGuestPostsPostId(props: {
  guest: GuestPayload;
  postId: string;
}): Promise<IRedditLikePost> {
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      title: true,
      type: true,
      content: true,
      url: true,
      image_url: true,
      score: true,
      comment_count: true,
      author: RedditLikeMemberAtSummaryTransformer.select(),
      community: RedditLikeCommunityAtSummaryTransformer.select(),
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    id: post.id,
    title: post.title,
    type: post.type as "text" | "link" | "image",
    content: post.content ?? null,
    url: post.url ?? null,
    image_url: post.image_url ?? null,
    score: post.score,
    comment_count: post.comment_count,
    author: await RedditLikeMemberAtSummaryTransformer.transform(post.author),
    community: await RedditLikeCommunityAtSummaryTransformer.transform(
      post.community,
    ),
    created_at: post.created_at.toISOString(),
    updated_at: post.updated_at.toISOString(),
    deleted_at: post.deleted_at ? post.deleted_at.toISOString() : null,
  };
}
