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

export async function test_api_article_view_by_citizen(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Set up administrator actor
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionAdministrator.IJoin,
  });
  // Step 2: Create a section as administrator
  const section: IEconomicDiscussionSection =
    await generate_random_economic_discussion_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // Step 3: Set up citizen actor
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenAuthorized = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionCitizen.IJoin,
  });
  typia.assert(citizenAuthorized);
  // Step 4: Authenticate citizen with same email used for join
  if (citizenAuthorized.email !== null && citizenAuthorized.email !== undefined) {
    await authorize_citizen_login(citizenConnection, {
      body: {
        email: citizenAuthorized.email satisfies string as string,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicDiscussionCitizen.ILogin,
    });
  }
  // Step 5: Create an article as the authenticated citizen - with empty body since ICreate is {}
  const article: IEconomicDiscussionArticle =
    await generate_random_economic_discussion_citizen_articles_create(
      citizenConnection,
      {
        body: {} satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 6: Validate article creation details - only properties that exist in IEconomicDiscussionArticle
  TestValidator.equals(
    "article has non-empty title",
    article.title.length > 0,
    true,
  );
  TestValidator.predicate(
    "article has posted_time",
    article.posted_time !== null,
  );
  TestValidator.equals(
    "article has correct author ID",
    article.author.id,
    citizenAuthorized.id,
  );
  TestValidator.predicate(
    "article has tags array",
    Array.isArray(article.tags),
  );
  TestValidator.equals(
    "article has expected comment count",
    article.comment_count,
    0,
  );
  // Step 7: Retrieve the article by ID using the citizen's own connection
  const retrievedArticle: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.citizen.articles.getById(
      citizenConnection,
      { id: article.id },
    );
  typia.assert(retrievedArticle);
  // Step 8: Validate that retrieved article matches created article
  TestValidator.equals(
    "retrieved article ID matches created article ID",
    retrievedArticle.id,
    article.id,
  );
  TestValidator.equals(
    "retrieved article title matches created article title",
    retrievedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "retrieved article author ID matches created article author ID",
    retrievedArticle.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "retrieved article comment count matches created article comment count",
    retrievedArticle.comment_count,
    article.comment_count,
  );
  TestValidator.equals(
    "retrieved article tags length matches created article tags length",
    retrievedArticle.tags.length,
    article.tags.length,
  );
  TestValidator.predicate(
    "tags are of correct type",
    retrievedArticle.tags.every((tag) => tag.name !== undefined),
  );
}