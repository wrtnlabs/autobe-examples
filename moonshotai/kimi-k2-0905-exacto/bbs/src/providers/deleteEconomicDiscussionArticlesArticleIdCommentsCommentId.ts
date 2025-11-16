import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconomicDiscussionArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionComment> {
  // Verify comment exists and belongs to the article
  const comment = await MyGlobal.prisma.economic_discussion_comments.findUnique(
    {
      where: { id: props.commentId },
    },
  );

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  if (comment.economic_discussion_article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to specified article",
      400,
    );
  }

  // Check authorization
  if (props.member.type === "member") {
    // For member type, can only delete own comments
    if (comment.economic_discussion_member_id !== props.member.id) {
      throw new HttpException("Not authorized to delete this comment", 403);
    }
  } else if (props.member.type === "moderator") {
    // Moderators can delete any comments, no ownership check needed
  } else {
    throw new HttpException("Invalid user type", 403);
  }

  // Perform soft delete
  const currentTime = toISOStringSafe(new Date());
  const updatedComment =
    await MyGlobal.prisma.economic_discussion_comments.update({
      where: { id: props.commentId },
      data: {
        deleted_at: currentTime,
      },
    });

  return {
    id: updatedComment.id as string & tags.Format<"uuid">,
    economic_discussion_article_id:
      updatedComment.economic_discussion_article_id as string &
        tags.Format<"uuid">,
    economic_discussion_member_id:
      updatedComment.economic_discussion_member_id as string &
        tags.Format<"uuid">,
    parent_id: updatedComment.parent_id as
      | (string & tags.Format<"uuid">)
      | null
      | undefined,
    content: updatedComment.content,
    status: updatedComment.status as "pending" | "approved" | "rejected",
    created_at: toISOStringSafe(updatedComment.created_at),
    updated_at: toISOStringSafe(updatedComment.updated_at),
    deleted_at: currentTime,
  };
}
