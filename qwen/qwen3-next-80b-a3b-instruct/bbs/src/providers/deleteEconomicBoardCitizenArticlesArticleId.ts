import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEconomicBoardCitizenArticlesArticleId(props: {
  citizen: CitizenPayload;
  articleId: string;
}): Promise<void> {
  const article =
    await MyGlobal.prisma.economic_board_articles.findUniqueOrThrow({
      where: { id: props.articleId, is_deleted: false },
    });
  if (article.author_id !== props.citizen.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.economic_board_articles.update({
    where: { id: props.articleId },
    data: {
      is_deleted: true,
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
