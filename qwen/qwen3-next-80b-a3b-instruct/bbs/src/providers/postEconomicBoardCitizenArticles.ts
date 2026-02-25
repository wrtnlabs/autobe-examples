import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardArticleCollector } from "../collectors/EconomicBoardArticleCollector";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { EconomicBoardArticleTransformer } from "../transformers/EconomicBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicBoardCitizenArticles(props: {
  citizen: CitizenPayload;
  body: IEconomicBoardArticle.ICreate;
}): Promise<IEconomicBoardArticle> {
  // Validate section exists before creating article
  await MyGlobal.prisma.economic_board_sections.findUniqueOrThrow({
    where: { id: props.body.section_id },
  });
  // Use collector to build create input with proper relations
  const created = await MyGlobal.prisma.economic_board_articles.create({
    data: await EconomicBoardArticleCollector.collect({
      body: props.body,
      economicBoardCitizens: {
        id: props.citizen.id,
      },
    }),
    ...EconomicBoardArticleTransformer.select(),
  });
  // Transform database result into response DTO
  return await EconomicBoardArticleTransformer.transform(created);
}
