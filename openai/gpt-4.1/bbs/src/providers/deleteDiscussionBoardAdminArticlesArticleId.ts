import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, articleId } = props;

  // 1. Retrieve the article by PK, include deleted_at for hard/soft deletion check
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
    select: { id: true, deleted_at: true },
  });
  if (!article) throw new HttpException("Article not found", 404);

  // 2. Edge case: Article already soft-deleted by user
  if (article.deleted_at !== null)
    throw new HttpException("Article already deleted", 410);

  // 3. Delete the article permanently (attachments/comments cascade on delete)
  await MyGlobal.prisma.discussion_board_articles.delete({
    where: { id: articleId },
  });

  // 4. Insert audit log for traceability (admin action, no moderation_action_id is available, pass empty string)
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4(),
      actor_admin_id: admin.id,
      target_article_id: articleId,
      target_comment_id: null,
      moderation_action_id: "",
      audit_event_type: "admin_hard_delete",
      audit_details:
        "Article and all related content permanently deleted by admin via system endpoint.",
      created_at: toISOStringSafe(new Date()),
    },
  });
}
