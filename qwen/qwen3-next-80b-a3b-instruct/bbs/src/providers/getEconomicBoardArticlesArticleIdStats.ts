import { IEconomicBoardArticleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleViewStat";
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

export async function getEconomicBoardArticlesArticleIdStats(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardArticleViewStat> {
  const stats =
    await MyGlobal.prisma.economic_board_article_view_stats.findUnique({
      where: { economic_board_article_id: props.articleId },
    });
  if (!stats) {
    throw new HttpException("Article view statistics not found", 404);
  }
  return stats as IEconomicBoardArticleViewStat;
}
