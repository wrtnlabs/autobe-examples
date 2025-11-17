import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityForumUserPostsPostId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityForumCommunityPost.IUpdate;
}): Promise<ICommunityForumCommunityPost> {
  // First, fetch the existing post to verify ownership and edit window
  const existingPost = await MyGlobal.prisma.community_forum_posts.findUnique({
    where: {
      id: props.postId,
    },
  });

  // Check if post exists
  if (!existingPost) {
    throw new HttpException("Post not found", 404);
  }

  // Verify that the post belongs to the authenticated user
  if (existingPost.community_forum_user_id !== props.user.id) {
    throw new HttpException("You are not authorized to edit this post", 403);
  }

  // Check if the post has been deleted
  if (existingPost.deleted_at !== null) {
    throw new HttpException("Cannot edit a deleted post", 400);
  }

  // Check if the post is still within the editable timeframe (6 hours)
  // Converting date strings to numbers for comparison
  const createdAtMs = new Date(existingPost.created_at).getTime();
  const nowMs = new Date().getTime();
  const sixHoursInMs = 6 * 60 * 60 * 1000;

  if (nowMs - createdAtMs > sixHoursInMs) {
    throw new HttpException("Post editing window has expired", 400);
  }

  // Update the post directly with inline parameters
  const updatedPost = await MyGlobal.prisma.community_forum_posts.update({
    where: {
      id: props.postId,
    },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.body !== undefined && { body: props.body.body }),
      ...(props.body.url !== undefined && { url: props.body.url }),
      ...(props.body.image_uri !== undefined && {
        image_uri: props.body.image_uri,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated post
  return {
    id: updatedPost.id,
    community_forum_community_id: updatedPost.community_forum_community_id,
    community_forum_user_id: updatedPost.community_forum_user_id,
    community_forum_user_session_id:
      updatedPost.community_forum_user_session_id,
    title: updatedPost.title,
    type: typia.assert<"link" | "text" | "image">(updatedPost.type),
    body: updatedPost.body === null ? undefined : updatedPost.body,
    url: updatedPost.url === null ? undefined : updatedPost.url,
    image_uri:
      updatedPost.image_uri === null ? undefined : updatedPost.image_uri,
    created_at: toISOStringSafe(updatedPost.created_at),
    updated_at: toISOStringSafe(updatedPost.updated_at),
    deleted_at:
      updatedPost.deleted_at === null
        ? undefined
        : toISOStringSafe(updatedPost.deleted_at),
  };
}
