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

export async function deleteDiscussionBoardAdminArticlesArticleIdFavorites(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the article exists using findUniqueOrThrow
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Delete all favorite records for this article
  await MyGlobal.prisma.discussion_board_article_favorites.deleteMany({
    where: { discussion_board_article_id: props.articleId },
  });
  // Log the admin action for audit trail
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.admin.id,
      actor_type: "admin",
      action_type: "DELETE_ARTICLE_FAVORITES",
      description: `Admin ${props.admin.id} removed all favorites for article ${props.articleId}`,
      target_article_id: props.articleId,
      ip_address: null,
      user_agent: null,
      metadata: JSON.stringify({
        articleId: props.articleId,
        adminId: props.admin.id,
        action: "delete_all_favorites",
      }),
      success: true,
      error_message: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
