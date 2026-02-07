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

export async function deleteDiscussionBoardSuperAdminArticlesArticleIdCommentsCommentId(props: {
  superAdmin: SuperadminPayload;
  articleId: string;
  commentId: string;
}): Promise<void> {
  // Find the comment with its relations to verify ownership and article association
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
      deleted_at: null, // Only allow deleting non-deleted comments
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Authorization: comment author or super admin
  const isAuthor = comment.discussion_board_member_id === props.superAdmin.id;
  const isSuperAdmin = props.superAdmin.type === "superAdmin";
  if (!isAuthor && !isSuperAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete: set deleted_at timestamp
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
