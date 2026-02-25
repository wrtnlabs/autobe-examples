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

export async function deleteEconomicBoardAdministratorArticlesArticleId(props: {
  administrator: AdministratorPayload;
  articleId: string;
}): Promise<void> {
  const article = await MyGlobal.prisma.economic_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (article === null || article.is_deleted) {
    throw new HttpException("This article has been deleted.", 404);
  }
  // Check if administrator is owner or admin
  if (
    article.author_id !== props.administrator.id &&
    props.administrator.type !== "administrator"
  ) {
    throw new HttpException("You cannot delete this article.", 403);
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.economic_board_articles.update({
    where: { id: props.articleId },
    data: {
      is_deleted: true,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.economic_board_administrator_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_id: props.administrator.id,
      action_type: "DELETE_ARTICLE" as const,
      target_id: props.articleId,
      created_at: now,
      updated_at: now,
      ip_address: "127.0.0.1",
    },
  });
}
