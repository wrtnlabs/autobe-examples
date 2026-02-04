import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_discussion_article } from "../prepare/prepare_random_economic_discussion_article";

export async function generate_random_economic_discussion_citizen_articles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicDiscussionArticle.ICreate>;
  },
): Promise<IEconomicDiscussionArticle> {
  const prepared: IEconomicDiscussionArticle.ICreate =
    prepare_random_economic_discussion_article(props.body);
  const result: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.citizen.articles.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
