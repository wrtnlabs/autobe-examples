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

export async function putDiscussionBoardMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  // First verify the post exists and is not deleted
  const postExists = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });

  if (!postExists) {
    throw new HttpException("Post not found", 404);
  }

  // Verify the comment exists, belongs to the specified post, and is not deleted
  const existingComment =
    await MyGlobal.prisma.discussion_board_comments.findFirst({
      where: {
        id: props.commentId,
        discussion_board_post_id: props.postId,
        deleted_at: null,
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

  if (!existingComment) {
    throw new HttpException("Comment not found", 404);
  }

  // Verify the requesting member is the comment author
  if (existingComment.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: You can only update your own comments",
      403,
    );
  }

  // Update the comment content
  const updatedComment = await MyGlobal.prisma.discussion_board_comments.update(
    {
      where: {
        id: props.commentId,
      },
      data: {
        content: props.body.content,
        updated_at: toISOStringSafe(new Date()),
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
    },
  );

  // Convert to API response format
  return {
    id: updatedComment.id,
    content: updatedComment.content,
    status: updatedComment.status,
    thread_level: updatedComment.thread_level,
    created_at: toISOStringSafe(updatedComment.created_at),
    updated_at: toISOStringSafe(updatedComment.updated_at),
    deleted_at: updatedComment.deleted_at
      ? toISOStringSafe(updatedComment.deleted_at)
      : undefined,
    post: {
      id: updatedComment.post.id,
      type: "post",
      title: updatedComment.post.title,
    },
    author: {
      id: updatedComment.author.id,
      type: "member",
      name: updatedComment.author.display_name ?? "Unknown",
    },
    parent_id: updatedComment.parent_id ?? undefined,
  };
}
