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
import { EconomyPoliticsBoardArticleCollector } from "../collectors/EconomyPoliticsBoardArticleCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomyPoliticsBoardArticleTransformer } from "../transformers/EconomyPoliticsBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomyPoliticsBoardUserArticles(props: {
  user: UserPayload;
  body: IEconomyPoliticsBoardArticle.ICreate;
}): Promise<IEconomyPoliticsBoardArticle> {
  const section =
    await MyGlobal.prisma.economy_politics_board_sections.findUnique({
      where: { id: props.body.section_id },
    });
  if (!section) throw new HttpException("Section not found", 404);
  const prismaInput = await EconomyPoliticsBoardArticleCollector.collect({
    body: props.body,
    economyPoliticsBoardUsers: { id: props.user.id },
  });
  const created = await MyGlobal.prisma.economy_politics_board_articles.create({
    data: prismaInput,
  });
  return await EconomyPoliticsBoardArticleTransformer.transform(created);
}
