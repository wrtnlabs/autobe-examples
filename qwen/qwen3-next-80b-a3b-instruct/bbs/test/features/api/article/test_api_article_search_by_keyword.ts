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

export async function test_api_article_search_by_keyword(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as citizen
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionCitizen.IJoin,
  });
  // Step 2: Search for articles with 'economic' keyword
  // This relies on pre-existing data in the integration test environment
  // As per scenario requirements, the system should contain articles with 'economic' in title
  const searchResponse =
    await api.functional.economicDiscussion.citizen.articles.index(
      citizenConnection,
      {
        body: {
          search_term: "economic",
        } satisfies IEconomicDiscussionArticle.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Step 3: Validate pagination
  TestValidator.equals(
    "page should be 1 by default",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 20 by default",
    searchResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "total records should be at least 1",
    () => searchResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages should be at least 1",
    () => searchResponse.pagination.pages >= 1,
  );
  // Step 4: Validate search results
  // Search for articles containing 'economic' in title
  TestValidator.predicate(
    "at least one article should contain 'economic' in title",
    () => {
      return searchResponse.data.some((article) =>
        article.title.toLowerCase().includes("economic"),
      );
    },
  );
  // Step 5: Ensure results are sorted by newest first (descending)
  // ISummary uses 'created_at' as the date field
  const sortedByDate = [...searchResponse.data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  TestValidator.index(
    "articles should be sorted by newest first",
    sortedByDate,
    searchResponse.data,
  );
  // Step 6: Verify that exact number of articles returned matches page limit (20) for first page
  TestValidator.equals(
    "first page should return exactly 20 articles",
    searchResponse.data.length,
    20,
  );
}
