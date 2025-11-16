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

export async function putEconomicDiscussionMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionComment.IUpdate;
}): Promise<IEconomicDiscussionComment> {
  // Verify the comment exists and belongs to the article
  const existingComment =
    await MyGlobal.prisma.economic_discussion_comments.findUnique({
      where: { id: props.commentId },
    });

  if (!existingComment) {
    throw new HttpException("Comment not found", 404);
  }

  // Verify the comment belongs to the specified article
  if (existingComment.economic_discussion_article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to specified article",
      404,
    );
  }

  // Verify the member is the owner of the comment
  if (existingComment.economic_discussion_member_id !== props.member.id) {
    throw new HttpException("You can only update your own comments", 403);
  }

  // Cannot update deleted comments
  if (existingComment.deleted_at !== null) {
    throw new HttpException("Cannot update a deleted comment", 400);
  }

  // Use a transaction to ensure data consistency
  const updatedComment = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update the comment
    const updated = await prisma.economic_discussion_comments.update({
      where: { id: props.commentId },
      data: {
        content: props.body.content ?? existingComment.content,
        updated_at: new Date(),
      },
    });

    // Create version snapshot if content was changed
    if (props.body.content && props.body.content !== existingComment.content) {
      await prisma.economic_discussion_comment_versions.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          economic_discussion_comment_id: updated.id,
          content: existingComment.content,
          created_at: new Date(),
        },
      });
    }

    return updated;
  });

  // Return formatted response
  return {
    id: updatedComment.id,
    economic_discussion_article_id:
      updatedComment.economic_discussion_article_id,
    economic_discussion_member_id: updatedComment.economic_discussion_member_id,
    parent_id: updatedComment.parent_id,
    content: updatedComment.content,
    status: typia.assert<"pending" | "approved" | "rejected">(
      updatedComment.status,
    ),
    created_at: toISOStringSafe(existingComment.created_at),
    updated_at: toISOStringSafe(updatedComment.updated_at),
    deleted_at: updatedComment.deleted_at
      ? toISOStringSafe(updatedComment.deleted_at)
      : undefined,
  } satisfies IEconomicDiscussionComment;
}
