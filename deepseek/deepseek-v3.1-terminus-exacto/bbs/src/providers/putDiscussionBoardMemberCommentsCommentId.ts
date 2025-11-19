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

export async function putDiscussionBoardMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  // First, verify the comment exists and belongs to the authenticated member
  const existingComment =
    await MyGlobal.prisma.discussion_board_comments.findUnique({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
    });

  if (!existingComment) {
    throw new HttpException("Comment not found", 404);
  }

  // Verify the comment belongs to the authenticated member
  if (existingComment.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "You do not have permission to update this comment",
      403,
    );
  }

  // Update the comment with the new content
  const updatedComment = await MyGlobal.prisma.discussion_board_comments.update(
    {
      where: { id: props.commentId },
      data: {
        content: props.body.content,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  // Fetch the complete comment with relationships for the response
  const commentWithRelations =
    await MyGlobal.prisma.discussion_board_comments.findUnique({
      where: { id: props.commentId },
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

  if (!commentWithRelations) {
    throw new HttpException("Comment not found after update", 404);
  }

  // Convert the response to match the API interface
  return {
    id: commentWithRelations.id,
    content: commentWithRelations.content,
    status: commentWithRelations.status,
    thread_level: commentWithRelations.thread_level,
    created_at: toISOStringSafe(commentWithRelations.created_at),
    updated_at: toISOStringSafe(commentWithRelations.updated_at),
    deleted_at: commentWithRelations.deleted_at
      ? toISOStringSafe(commentWithRelations.deleted_at)
      : undefined,
    parent_id: commentWithRelations.parent_id
      ? commentWithRelations.parent_id
      : undefined,
    post: {
      id: commentWithRelations.post.id,
      type: "post",
      title: commentWithRelations.post.title,
    },
    author: {
      id: commentWithRelations.author.id,
      type: "member",
      name: commentWithRelations.author.display_name ?? "Anonymous",
    },
  };
}
