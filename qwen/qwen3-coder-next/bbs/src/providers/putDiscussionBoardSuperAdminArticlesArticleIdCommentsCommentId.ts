import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminArticlesArticleIdCommentsCommentId(props: {
  superAdmin: SuperadminPayload;
  articleId: string;
  commentId: string;
  body: IDiscussionBoardArticleComment.IUpdate;
}): Promise<IDiscussionBoardArticleComment> {
  // Find the existing comment and verify authorization
  const existingComment =
    await MyGlobal.prisma.discussion_board_comments.findFirst({
      where: {
        id: props.commentId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (!existingComment) {
    throw new HttpException("Comment not found", 404);
  }
  // Update the comment content and timestamp
  const updatedComment = await MyGlobal.prisma.discussion_board_comments.update(
    {
      where: { id: props.commentId },
      data: {
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  // Return the updated comment with proper format
  return {
    id: updatedComment.id as string & tags.Format<"uuid">,
    content: updatedComment.content,
    created_at: toISOStringSafe(updatedComment.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updatedComment.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: updatedComment.deleted_at
      ? (toISOStringSafe(updatedComment.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
    author_id: updatedComment.discussion_board_member_id as string &
      tags.Format<"uuid">,
    article_id: updatedComment.discussion_board_article_id as string &
      tags.Format<"uuid">,
  };
}
