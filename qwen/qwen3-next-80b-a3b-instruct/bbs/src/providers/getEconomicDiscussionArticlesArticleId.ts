import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicDiscussionArticleTransformer } from "../transformers/EconomicDiscussionArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicDiscussionArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionArticle> {
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
      ...EconomicDiscussionArticleTransformer.select(),
    },
  );
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  return await EconomicDiscussionArticleTransformer.transform(article);
}
