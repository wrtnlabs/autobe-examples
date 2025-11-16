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

export async function putEconomicDiscussionArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionComment.IUpdate;
}): Promise<IEconomicDiscussionComment> {
  // Verify the comment exists and belongs to the specified article
  const existingComment =
    await MyGlobal.prisma.economic_discussion_comments.findFirst({
      where: {
        id: props.commentId,
        economic_discussion_article_id: props.articleId,
        economic_discussion_member_id: props.member.id,
        deleted_at: null,
      },
    });

  if (!existingComment) {
    throw new HttpException(
      "Comment not found or you don't have permission to edit it",
      404,
    );
  }

  // Update the comment
  const updatedComment =
    await MyGlobal.prisma.economic_discussion_comments.update({
      where: {
        id: props.commentId,
      },
      data: {
        content:
          props.body.content !== undefined
            ? props.body.content
            : existingComment.content,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updatedComment.id,
    economic_discussion_article_id:
      updatedComment.economic_discussion_article_id,
    economic_discussion_member_id: updatedComment.economic_discussion_member_id,
    parent_id:
      updatedComment.parent_id === null
        ? undefined
        : (updatedComment.parent_id as string | undefined),
    content: updatedComment.content,
    status: typia.assert<"pending" | "approved" | "rejected">(
      updatedComment.status,
    ),
    created_at: toISOStringSafe(updatedComment.created_at),
    updated_at: toISOStringSafe(updatedComment.updated_at),
    deleted_at: updatedComment.deleted_at
      ? toISOStringSafe(updatedComment.deleted_at)
      : undefined,
  };
}
