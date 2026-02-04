import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_discussion_citizen_articles_create } from "../../../generate/generate_random_economic_discussion_citizen_articles_create";
import { prepare_random_economic_discussion_article } from "../../../prepare/prepare_random_economic_discussion_article";

export async function test_api_article_filter_by_multiple_tags(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as citizen to create articles
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://${RandomGenerator.alphaNumeric(12)}.io`,
      referrer: `https://${RandomGenerator.alphaNumeric(12)}.com`,
    } satisfies IEconomicDiscussionCitizen.IJoin,
  });
  // Step 2: Create first article with tag "economics"
  const article1 =
    await generate_random_economic_discussion_citizen_articles_create(
      citizenConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          tags: ["economics"],
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article1);
  // Step 3: Create second article with overlapping tag "economics" and unique tag "finance"
  const article2 =
    await generate_random_economic_discussion_citizen_articles_create(
      citizenConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          tags: ["economics", "finance"],
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article2);
  // Step 4: Search for articles with both "economics" and "finance" tags (AND logic)
  // Use "x" as search_term to satisfy minlength constraint (required by schema) without affecting tag filtering
  const searchResult =
    await api.functional.economicDiscussion.citizen.articles.index(
      citizenConnection,
      {
        body: {
          search_term: "x", // Satisfies MinLength<1>
          tag_filters: ["economics", "finance"],
        } satisfies IEconomicDiscussionArticle.IRequest,
      },
    );
  typia.assert(searchResult);
  // Step 5: Validate that only article2 appears in results (has both tags)
  TestValidator.equals(
    "search result has exactly one article",
    searchResult.data.length,
    1,
  );
  TestValidator.equals(
    "only article with both tags is returned",
    searchResult.data[0].id,
    article2.id,
  );
  // Step 6: Confirm article1 (with only economics) is not in results
  TestValidator.notEquals(
    "article1 not in results",
    searchResult.data[0].id,
    article1.id,
  );
  // Step 7: Validate exact tag set on returned article
  TestValidator.equals(
    "article has exactly two tags",
    searchResult.data[0].tags.length,
    2,
  );
  TestValidator.predicate(
    "contains economics",
    searchResult.data[0].tags.includes("economics"),
  );
  TestValidator.predicate(
    "contains finance",
    searchResult.data[0].tags.includes("finance"),
  );
}
