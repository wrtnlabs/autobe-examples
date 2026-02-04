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

export async function test_api_article_creation_by_citizen(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create two sections using administrator account for article association
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionAdministrator.IJoin,
  });
  const section1 =
    await generate_random_economic_discussion_administrator_sections_create(
      adminConnection,
      {
        body: {},
      },
    );
  const section2 =
    await generate_random_economic_discussion_administrator_sections_create(
      adminConnection,
      {
        body: {},
      },
    );
  // Step 2: Authenticate citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionCitizen.IJoin,
  });
  // Step 3: Create article with user data including section association
  const article =
    await api.functional.economicDiscussion.citizen.articles.create(
      citizenConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 15,
            sentenceMax: 25,
          }),
          section_id: section1.id,
          tags: ["economy", "markets", "investing"],
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  // Step 4: Validate article creation with full metadata
  typia.assert(article);
  // Step 5: Verify required properties and structure
  TestValidator.equals("article has title", typeof article.title, "string");
  TestValidator.equals(
    "article has valid ID format",
    typeof article.id,
    "string",
  );
  TestValidator.predicate(
    "article has creation timestamp",
    article.posted_time !== null,
  );
  TestValidator.equals(
    "article has author",
    typeof article.author.id,
    "string",
  );
  TestValidator.predicate(
    "article has tags",
    Array.isArray(article.tags) && article.tags.length >= 0,
  );
  TestValidator.equals(
    "article comment count is number",
    typeof article.comment_count,
    "number",
  );
}
