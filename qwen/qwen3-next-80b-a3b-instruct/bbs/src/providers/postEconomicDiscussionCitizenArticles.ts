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
import { EconomicDiscussionArticleCollector } from "../collectors/EconomicDiscussionArticleCollector";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { EconomicDiscussionArticleTransformer } from "../transformers/EconomicDiscussionArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicDiscussionCitizenArticles(props: {
  citizen: CitizenPayload;
  body: IEconomicDiscussionArticle.ICreate;
}): Promise<IEconomicDiscussionArticle> {
  // The ICreate interface is empty, so no section reference is provided in body
  // The collector code connects section to citizen, which aligns with the operation spec's section requirement
  // Use collector to transform API DTO to Prisma CreateInput
  const created = await MyGlobal.prisma.economic_discussion_articles.create({
    data: await EconomicDiscussionArticleCollector.collect({
      body: props.body,
      economicDiscussionCitizens: { id: props.citizen.id },
      economicDiscussionCitizenSessions: { id: props.citizen.session_id },
    }),
    ...EconomicDiscussionArticleTransformer.select(),
  });
  // Use transformer to convert Prisma result to API DTO
  return await EconomicDiscussionArticleTransformer.transform(created);
}
