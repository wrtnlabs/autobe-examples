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

export async function deleteEconomicPoliticalBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.economic_political_board_comments.deleteMany({
      where: { article_id: props.articleId },
    });
    await tx.economic_political_board_attachments.deleteMany({
      where: { article_id: props.articleId },
    });
    await tx.economic_political_board_article_tags.deleteMany({
      where: { article_id: props.articleId },
    });
    await tx.economic_political_board_articles.delete({
      where: { id: props.articleId },
    });
  });
}
