import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  // First, verify the comment exists and belongs to the specified post
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      discussion_board_post_id: props.postId,
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Verify authorization: member can only delete their own comments
  if (comment.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own comments",
      403,
    );
  }

  // Perform soft deletion by setting deleted_at timestamp
  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      status: "deleted",
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Fetch the related post for the summary
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: comment.discussion_board_post_id },
    select: {
      id: true,
      title: true,
    },
  });

  if (!post) {
    throw new HttpException("Associated post not found", 404);
  }

  // Fetch the related author for the summary
  const author = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: comment.discussion_board_member_id },
    select: {
      id: true,
      display_name: true,
    },
  });

  if (!author) {
    throw new HttpException("Author not found", 404);
  }

  // Map to the expected response format
  return {
    id: updated.id,
    content: updated.content,
    status: updated.status,
    thread_level: updated.thread_level,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    post: {
      id: post.id,
      type: "post",
      title: post.title,
    },
    author: {
      id: author.id,
      type: "member",
      name: author.display_name ?? "",
    },
    parent_id: updated.parent_id
      ? (updated.parent_id as string & tags.Format<"uuid">)
      : undefined,
  };
}
