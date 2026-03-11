import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminArticlesArticleIdCommentsCommentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the comment and verify it exists (404 if not found)
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        discussion_board_article_id: true,
        discussion_board_member_id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Verify comment belongs to the specified article (400 if mismatch)
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      400,
    );
  }
  // Perform soft deletion by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
