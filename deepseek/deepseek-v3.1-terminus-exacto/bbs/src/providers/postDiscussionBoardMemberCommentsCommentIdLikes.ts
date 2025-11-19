import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCommentLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentLike";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberCommentsCommentIdLikes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentLike.ICreate;
}): Promise<IDiscussionBoardCommentLike> {
  // Verify commentId parameter matches the body comment_id
  if (props.commentId !== props.body.comment_id) {
    throw new HttpException(
      "Comment ID parameter does not match request body",
      400,
    );
  }

  // Verify the target comment exists and is accessible
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.body.comment_id,
      deleted_at: null,
    },
    include: {
      author: {
        select: {
          id: true,
          display_name: true,
          email: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Check if member already liked this comment
  const existingLike =
    await MyGlobal.prisma.discussion_board_comment_likes.findFirst({
      where: {
        discussion_board_member_id: props.member.id,
        discussion_board_comment_id: props.body.comment_id,
        deleted_at: null,
      },
    });

  if (existingLike) {
    throw new HttpException("You have already liked this comment", 409);
  }

  // Create the new like record
  const createdLike =
    await MyGlobal.prisma.discussion_board_comment_likes.create({
      data: {
        id: v4(),
        discussion_board_member_id: props.member.id,
        discussion_board_comment_id: props.body.comment_id,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });

  // Get member information for the response
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.member.id },
    select: {
      id: true,
      display_name: true,
      email: true,
    },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  return {
    id: createdLike.id,
    created_at: toISOStringSafe(createdLike.created_at),
    updated_at: toISOStringSafe(createdLike.updated_at),
    deleted_at: createdLike.deleted_at
      ? toISOStringSafe(createdLike.deleted_at)
      : undefined,
    member: {
      id: member.id,
      type: "member",
      name: member.display_name ?? "Unknown Member",
    },
    comment: {
      id: comment.id,
      content: comment.content,
      status: comment.status,
      thread_level: comment.thread_level,
      created_at: toISOStringSafe(comment.created_at),
      author: {
        id: comment.author.id,
        type: "member",
        name: comment.author.display_name ?? "Unknown Author",
      },
      post: {
        id: comment.post.id,
        type: "post",
        title: comment.post.title,
      },
    },
  };
}
