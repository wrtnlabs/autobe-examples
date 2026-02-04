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

export async function test_api_article_view_by_other_citizen(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join two distinct citizen users
  const firstCitizenConnection: api.IConnection = { host: connection.host };
  const firstCitizen = await authorize_citizen_join(firstCitizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://${RandomGenerator.alphaNumeric(12)}.io`,
      referrer: `https://${RandomGenerator.alphaNumeric(10)}.org`,
    },
  });
  typia.assert(firstCitizen);
  const secondCitizenConnection: api.IConnection = { host: connection.host };
  const secondCitizen = await authorize_citizen_join(secondCitizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://${RandomGenerator.alphaNumeric(12)}.io`,
      referrer: `https://${RandomGenerator.alphaNumeric(10)}.org`,
    },
  });
  typia.assert(secondCitizen);
  // Step 2: Authenticate as the first citizen to create an article
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_login(authorConnection, {
    body: {
      email: typia.assert(firstCitizen.email!),
      password: firstCitizen.token.access,
    },
  });
  // Step 3: Create a section for the article
  const section =
    await generate_random_economic_discussion_administrator_sections_create(
      authorConnection,
      {
        body: {},
      },
    );
  typia.assert(section);
  // Step 4: Create article as first citizen
  const article =
    await generate_random_economic_discussion_citizen_articles_create(
      authorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 8,
          }),
          section_id: section.id,
        },
      },
    );
  typia.assert(article);
  // Step 5: Authenticate as the second citizen to view the article
  const viewerConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_login(viewerConnection, {
    body: {
      email: typia.assert(secondCitizen.email!),
      password: secondCitizen.token.access,
    },
  });
  // Step 6: View the article as the second citizen
  const viewedArticle =
    await api.functional.economicDiscussion.citizen.articles.getById(
      viewerConnection,
      {
        id: article.id,
      },
    );
  typia.assert(viewedArticle);
  // Step 7: Validate the returned article according to IEconomicDiscussionArticle schema
  TestValidator.equals(
    "article title matches",
    viewedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article author id matches",
    viewedArticle.author.id,
    firstCitizen.id,
  );
  TestValidator.predicate(
    "article is posted in the past",
    viewedArticle.posted_time !== null,
  );
  TestValidator.equals(
    "article comment count is 0",
    viewedArticle.comment_count,
    0,
  );
}
