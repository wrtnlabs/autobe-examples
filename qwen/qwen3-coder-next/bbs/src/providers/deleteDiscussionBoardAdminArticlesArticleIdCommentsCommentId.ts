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
  const { admin, articleId, commentId } = props;
  // Fetch the comment with its associated article and author
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: commentId,
      discussion_board_article_id: articleId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found or already deleted", 404);
  }
  // Check authorization: comment author or admin
  const isAuthor = comment.discussion_board_member_id === admin.id;
  if (!isAuthor) {
    // Verify admin privileges
    const adminRole =
      await MyGlobal.prisma.discussion_board_admins_roles.findFirst({
        where: {
          user_id: admin.id,
        },
      });
    if (!adminRole) {
      throw new HttpException("Forbidden - insufficient privileges", 403);
    }
  }
  // Perform soft delete
  const now = new Date();
  const deletedAt = toISOStringSafe(now);
  await MyGlobal.prisma.discussion_board_comments.update({
    where: {
      id: commentId,
    },
    data: {
      deleted_at: deletedAt as string & tags.Format<"date-time">,
    },
  });
  // Log audit trail for administrative action
  if (!isAuthor) {
    await MyGlobal.prisma.discussion_board_bans_admin_logs.create({
      data: {
        id: v4(),
        admin_id: admin.id,
        user_id: comment.discussion_board_member_id,
        action_type: "comment_delete",
        ban_reason: null,
        ban_start_time: toISOStringSafe(now),
        ban_end_time: null,
        unban_reason: null,
        notes: null,
        created_at: toISOStringSafe(now) as string & tags.Format<"date-time">,
      },
    });
  }
}
