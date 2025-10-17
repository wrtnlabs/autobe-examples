import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IUpdate;
}): Promise<ICommunityPlatformComment> {
  const { member, postId, commentId, body } = props;

  // Find the comment to update
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: {
      id: commentId,
      community_platform_post_id: postId,
    },
  });

  // Check if comment exists
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Check if authenticated member is the author
  if (comment.author_id !== member.id) {
    throw new HttpException(
      "Unauthorized: Only the author can update this comment",
      403,
    );
  }

  // Calculate edit window (10 minutes = 600000ms)
  const editWindowMs = 10 * 60 * 1000;
  const commentCreatedTime = Date.parse(toISOStringSafe(comment.created_at));
  const currentTime = Date.now();
  const timeElapsed = currentTime - commentCreatedTime;

  // Check if edit window has expired
  if (timeElapsed > editWindowMs) {
    throw new HttpException("EDIT_WINDOW_EXPIRED", 400);
  }

  // Create snapshot of original comment
  await MyGlobal.prisma.community_platform_comment_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_platform_comment_id: comment.id,
      moderator_id: null,
      author_id: comment.author_id,
      content: comment.content,
      vote_count: comment.vote_count,
      depth_level: comment.depth_level,
      status: comment.status,
      created_at: toISOStringSafe(new Date()),
      updated_at: comment.updated_at
        ? toISOStringSafe(new Date(comment.updated_at))
        : toISOStringSafe(new Date()),
      snapshot_reason: "edit",
      ip_address: "unknown",
      user_agent: "unknown",
    },
  });

  // Update the comment with new content and updated_at
  const updatedComment =
    await MyGlobal.prisma.community_platform_comments.update({
      where: {
        id: commentId,
      },
      data: {
        content: body.content,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Transform Prisma result to match ICommunityPlatformComment interface
  const transformedComment: ICommunityPlatformComment = {
    id: updatedComment.id,
    created_at: toISOStringSafe(updatedComment.created_at),
    author_id: updatedComment.author_id,
    content: updatedComment.content,
    vote_count: updatedComment.vote_count,
    status: updatedComment.status satisfies string as
      | "published"
      | "unreviewed"
      | "removed"
      | "archived",
    updated_at: toISOStringSafe(updatedComment.updated_at),
    deleted_at:
      updatedComment.deleted_at !== null
        ? toISOStringSafe(updatedComment.deleted_at)
        : undefined,
    community_platform_post_id: updatedComment.community_platform_post_id,
    parent_comment_id:
      updatedComment.parent_comment_id === null
        ? undefined
        : (updatedComment.parent_comment_id satisfies string as string),
    parent_post_snapshot_id:
      updatedComment.parent_post_snapshot_id === null
        ? undefined
        : (updatedComment.parent_post_snapshot_id satisfies string as string),
    depth_level: updatedComment.depth_level,
  };

  return transformedComment;
}
