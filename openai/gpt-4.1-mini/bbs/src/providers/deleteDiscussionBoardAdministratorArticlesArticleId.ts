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

export async function deleteDiscussionBoardAdministratorArticlesArticleId(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true },
  });
  if (article === null) {
    throw new HttpException("Article not found", 404);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_articles.delete({
      where: { id: props.articleId },
    }),
  ]);
}
