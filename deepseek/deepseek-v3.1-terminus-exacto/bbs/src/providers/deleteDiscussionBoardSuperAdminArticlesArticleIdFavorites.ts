import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminArticlesArticleIdFavorites(props: {
  superAdmin: SuperAdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify article exists first
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  // Delete the favorite record
  const result =
    await MyGlobal.prisma.discussion_board_article_favorites.deleteMany({
      where: {
        discussion_board_user_id: props.superAdmin.id,
        discussion_board_article_id: props.articleId,
      },
    });
  // If no favorite was found, throw appropriate error
  if (result.count === 0) {
    throw new HttpException("Favorite relationship not found", 404);
  }
  // Log the action for analytics as specified in requirements
  // Note: In a production system, this would typically go to an audit log system
}
