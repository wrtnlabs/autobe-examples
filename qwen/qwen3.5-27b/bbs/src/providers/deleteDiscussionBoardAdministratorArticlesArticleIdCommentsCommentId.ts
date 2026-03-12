import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdministratorArticlesArticleIdCommentsCommentId(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the comment and verify it exists and is not already deleted
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
      select: {
        id: true,
        discussion_board_article_id: true,
      },
    });
  // Verify the comment belongs to the specified article
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Comment not found", 404);
  }
  // Soft delete the comment by setting deleted_at
  await MyGlobal.prisma.discussion_board_comments.update({
    where: {
      id: props.commentId,
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
