import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformPostsPostId(props: {
  postId: string;
}): Promise<IRedditPlatformPost> {
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  return {
    id: post.id as string & tags.Format<"uuid">,
    author_id: post.author_id as string & tags.Format<"uuid">,
    community_id: post.community_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(post.created_at),
    comment_count: post.comment_count,
    content_text: post.content_text ?? undefined,
    updated_at: toISOStringSafe(post.updated_at),
    url: post.url ?? undefined,
    image_url: post.image_url ?? undefined,
    type: post.type,
    title: post.title,
    vote_score: post.vote_score,
  };
}
