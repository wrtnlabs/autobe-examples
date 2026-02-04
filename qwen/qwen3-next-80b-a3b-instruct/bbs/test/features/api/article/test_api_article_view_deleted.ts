import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_discussion_administrator_sections_create } from "../../../generate/generate_random_economic_discussion_administrator_sections_create";
import { generate_random_economic_discussion_citizen_articles_create } from "../../../generate/generate_random_economic_discussion_citizen_articles_create";
import { prepare_random_economic_discussion_article } from "../../../prepare/prepare_random_economic_discussion_article";
import { prepare_random_economic_discussion_section } from "../../../prepare/prepare_random_economic_discussion_section";

export async function test_api_article_view_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a citizen connection and register a citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenUser = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IEconomicDiscussionCitizen.IJoin,
  });
  typia.assert(citizenUser);
  // Step 2: Create an administrator connection and register an administrator user
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorUser = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/home",
      } satisfies IEconomicDiscussionAdministrator.IJoin,
    },
  );
  typia.assert(administratorUser);
  // Step 3: Create a section for the article (administrator-only operation)
  const section =
    await generate_random_economic_discussion_administrator_sections_create(
      administratorConnection,
      {},
    );
  typia.assert(section);
  // Step 4: Create an article as the citizen user
  // Note: IEconomicDiscussionArticle.ICreate is an empty object {} which means
  // the backend auto-generates all article content
  const article =
    await generate_random_economic_discussion_citizen_articles_create(
      citizenConnection,
      {},
    );
  typia.assert(article);
  // Step 5: Delete the article using the citizen connection (author)
  await api.functional.economicDiscussion.citizen.articles.erase(
    citizenConnection,
    {
      articleId: article.id,
    },
  );
  // Step 6: Attempt to view the deleted article - must result in error
  await TestValidator.error(
    "viewing a deleted article must fail because it no longer exists",
    async () => {
      await api.functional.economicDiscussion.citizen.articles.getById(
        citizenConnection,
        {
          id: article.id,
        },
      );
    },
  );
}
