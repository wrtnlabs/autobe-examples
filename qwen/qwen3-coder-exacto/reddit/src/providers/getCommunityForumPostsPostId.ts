import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";

export async function getCommunityForumPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityForumCommunityPost> {
  // Fetch the post from the database
  const post = await MyGlobal.prisma.community_forum_posts.findUnique({
    where: {
      id: props.postId,
      deleted_at: null, // Only fetch non-deleted posts
    },
  });

  // If post not found, throw 404
  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Transform the database record to the API response format
  return {
    id: post.id,
    community_forum_community_id: post.community_forum_community_id,
    community_forum_user_id: post.community_forum_user_id,
    community_forum_user_session_id: post.community_forum_user_session_id,
    title: post.title,
    type: post.type as "text" | "link" | "image",
    body: post.body ?? undefined,
    url: post.url ?? undefined,
    image_uri: post.image_uri ?? undefined,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : undefined,
  };
}
