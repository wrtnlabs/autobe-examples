import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function deleteDiscussionBoardMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  // First verify the comment exists and belongs to the authenticated member
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.commentId,
      discussion_board_member_id: props.member.id,
    },
    include: {
      post: {
        select: {
          id: true,
          title: true,
        },
      },
      author: {
        select: {
          id: true,
          display_name: true,
        },
      },
    },
  });

  if (!comment) {
    throw new HttpException(
      "Comment not found or you don't have permission to delete it",
      404,
    );
  }

  // Use transaction for atomic deletion of comment and attachments
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // First delete all attachments associated with this comment
    await tx.discussion_board_comment_attachments.deleteMany({
      where: {
        discussion_board_comment_id: props.commentId,
      },
    });

    // Then delete the comment itself
    const deletedComment = await tx.discussion_board_comments.delete({
      where: {
        id: props.commentId,
      },
    });

    return deletedComment;
  });

  // Fetch the post and author details separately since they're not included in the delete result
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: comment.discussion_board_post_id },
    select: { id: true, title: true },
  });

  const author = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: comment.discussion_board_member_id },
    select: { id: true, display_name: true },
  });

  if (!post || !author) {
    throw new HttpException("Related data not found", 404);
  }

  // Convert Date fields to ISO strings and return
  return {
    id: result.id,
    content: result.content,
    status: result.status,
    thread_level: result.thread_level,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at
      ? toISOStringSafe(result.deleted_at)
      : undefined,
    parent_id: result.parent_id ?? undefined,
    post: {
      id: post.id,
      type: "post",
      title: post.title,
    },
    author: {
      id: author.id,
      type: "member",
      name: author.display_name ?? "Unknown",
    },
  };
}
