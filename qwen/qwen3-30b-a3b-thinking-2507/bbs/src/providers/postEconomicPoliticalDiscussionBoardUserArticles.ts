import { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardArticleCollector } from "../collectors/EconomicPoliticalDiscussionBoardArticleCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicPoliticalDiscussionBoardArticleTransformer } from "../transformers/EconomicPoliticalDiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalDiscussionBoardUserArticles(props: {
  user: UserPayload;
  body: IEconomicPoliticalDiscussionBoardArticle.ICreate;
}): Promise<IEconomicPoliticalDiscussionBoardArticle> {
  const created =
    await MyGlobal.prisma.economic_political_discussion_board_articles.create({
      data: await EconomicPoliticalDiscussionBoardArticleCollector.collect({
        body: props.body,
        user: props.user,
      }),
      ...EconomicPoliticalDiscussionBoardArticleTransformer.select(),
    });
  return await EconomicPoliticalDiscussionBoardArticleTransformer.transform(
    created,
  );
}
