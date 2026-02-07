import { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import { IEconomyPoliticsBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleAttachment";
import { IEconomyPoliticsBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleTag";
import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomyPoliticsBoardArticleTransformer } from "../transformers/EconomyPoliticsBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomyPoliticsBoardArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IEconomyPoliticsBoardArticle> {
  const article =
    await MyGlobal.prisma.economy_politics_board_articles.findUnique({
      where: { id: props.articleId },
    });
  if (!article) throw new HttpException("Article not found", 404);
  return await EconomyPoliticsBoardArticleTransformer.transform(article);
}
