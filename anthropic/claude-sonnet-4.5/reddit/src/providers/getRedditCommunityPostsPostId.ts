import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

export async function getRedditCommunityPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPost> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  return {
    id: post.id,
    community_id: post.reddit_community_community_id,
    member_id: post.reddit_community_member_id,
    title: post.title,
    post_type: typia.assert<"link" | "text" | "image">(post.post_type),
    body: post.body,
    url: post.url,
    image_url: post.image_url,
    edited: post.edited,
    created_at: toISOStringSafe(post.created_at),
    updated_at: post.updated_at ? toISOStringSafe(post.updated_at) : null,
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
  };
}
