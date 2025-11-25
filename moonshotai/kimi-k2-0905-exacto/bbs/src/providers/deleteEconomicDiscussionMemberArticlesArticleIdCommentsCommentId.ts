import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconomicDiscussionMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionComment> {
  // Find the comment to verify existence and ownership
  const comment = await MyGlobal.prisma.economic_discussion_comments.findFirst({
    where: {
      id: props.commentId,
      economic_discussion_article_id: props.articleId,
      deleted_at: null, // Only consider non-deleted comments
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Verify ownership - member can only delete their own comments
  if (comment.economic_discussion_member_id !== props.member.id) {
    throw new HttpException("You can only delete your own comments", 403);
  }

  // Get current timestamp for soft deletion
  const now = new Date();

  // Perform soft delete by setting deleted_at timestamp
  const updatedComment =
    await MyGlobal.prisma.economic_discussion_comments.update({
      where: { id: props.commentId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });

  return {
    id: updatedComment.id,
    economic_discussion_article_id:
      updatedComment.economic_discussion_article_id,
    economic_discussion_member_id: updatedComment.economic_discussion_member_id,
    parent_id: updatedComment.parent_id ?? undefined,
    content: updatedComment.content,
    status: updatedComment.status as IEconomicDiscussionComment["status"],
    created_at: toISOStringSafe(updatedComment.created_at),
    updated_at: toISOStringSafe(updatedComment.updated_at),
    deleted_at: updatedComment.deleted_at
      ? toISOStringSafe(updatedComment.deleted_at)
      : undefined,
  };
}
