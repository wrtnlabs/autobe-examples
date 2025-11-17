import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityForumUserCommentsCommentIdReplies(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityForumPostComment.ICreate;
}): Promise<ICommunityForumPostComment> {
  // First, find the parent comment to validate it exists and get post info
  const parentComment =
    await MyGlobal.prisma.community_forum_comments.findUnique({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
    });

  // If parent comment doesn't exist or is deleted, throw 404
  if (!parentComment) {
    throw new HttpException("Parent comment not found", 404);
  }

  // Verify that the parent comment's post also exists and is not deleted
  const post = await MyGlobal.prisma.community_forum_posts.findUnique({
    where: {
      id: parentComment.community_forum_post_id,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Parent post not found or deleted", 404);
  }

  // Check if user has permission to post in this community
  // For now, we'll assume if they can access the comment, they can reply
  // In a full implementation, we might check community membership

  // Create the new reply comment
  const now = toISOStringSafe(new Date());
  const newComment = await MyGlobal.prisma.community_forum_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      body: props.body.body,
      parent_id: props.commentId,
      community_forum_post_id: parentComment.community_forum_post_id,
      community_forum_user_id: props.user.id,
      community_forum_user_session_id: props.user.session_id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return the created comment in the API format
  return {
    id: newComment.id,
    body: newComment.body,
    created_at: toISOStringSafe(newComment.created_at),
    updated_at: toISOStringSafe(newComment.updated_at),
    deleted_at: newComment.deleted_at
      ? toISOStringSafe(newComment.deleted_at)
      : null,
    community_forum_post_id: newComment.community_forum_post_id,
    community_forum_user_id: newComment.community_forum_user_id,
    parent_id: newComment.parent_id ?? undefined,
  };
}
