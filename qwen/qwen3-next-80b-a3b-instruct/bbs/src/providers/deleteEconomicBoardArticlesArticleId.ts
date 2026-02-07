import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteEconomicBoardArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // In AutoBE, the actor context is available via MyGlobal.context.actor
  const actor = MyGlobal.context?.actor;
  // If actor context is not available, fail with 403 (forbidden)
  if (!actor) throw new HttpException("Forbidden", 403);
  // Find the article
  const article = await MyGlobal.prisma.economic_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) throw new HttpException("Article not found", 404);
  // If article already deleted, return 404
  if (article.deleted_at)
    throw new HttpException("Article already deleted", 404);
  // Authorization: only administrators and superAdministrators can delete articles
  if (!actor.is_administrator && !actor.is_super_administrator) {
    throw new HttpException("Forbidden", 403);
  }
  // Update article with soft deletion timestamp
  const deletedAt = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  await MyGlobal.prisma.economic_board_articles.update({
    where: { id: props.articleId },
    data: { deleted_at: deletedAt },
  });
  // NOTE: The spec requests recording deletion in audit log, but
  // no article_deletions audit table exists in the schema.
  // Recording in economic_board_section_deletions would be semantically incorrect.
  // Therefore, we omit audit logging as the schema doesn't allow it.
  // All audit is preserved in the deleted_at field on the article itself.
}
