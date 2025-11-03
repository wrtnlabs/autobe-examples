import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEPageSortDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPageSortDirection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticsBbsArticle";
import type { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import type { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";

export async function test_api_search_articles_empty_results(
  connection: api.IConnection,
) {
  // Create test member for authenticated context
  const member = await api.functional.auth.members.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  typia.assert(member);

  // Search with non-matching keyword
  const nonMatchingSearch =
    await api.functional.politicsBbs.search.articles.index(connection, {
      body: {
        search: "nonexistentarticlekeywordthatshouldnotmatch",
      } satisfies IPoliticsBbsArticle.IRequest,
    });
  typia.assert(nonMatchingSearch);

  TestValidator.equals(
    "non-matching search returns empty results",
    nonMatchingSearch.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching search has current page 1",
    nonMatchingSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "non-matching search has total records 0",
    nonMatchingSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-matching search has total pages 0",
    nonMatchingSearch.pagination.pages,
    0,
  );

  // Search with conflicting date filters (date after > date before)
  const dateAfter = new Date("2024-01-01").toISOString();
  const dateBefore = new Date("2023-01-01").toISOString();

  const conflictingDateSearch =
    await api.functional.politicsBbs.search.articles.index(connection, {
      body: {
        created_after: dateAfter,
        created_before: dateBefore,
      } satisfies IPoliticsBbsArticle.IRequest,
    });
  typia.assert(conflictingDateSearch);

  TestValidator.equals(
    "conflicting date range returns empty results",
    conflictingDateSearch.data.length,
    0,
  );

  // Search with combination of non-matching criteria
  const complexNonMatchingSearch =
    await api.functional.politicsBbs.search.articles.index(connection, {
      body: {
        search: "complexspecificquery123456",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        created_after: new Date(Date.now() + 86400000).toISOString(), // Future date
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "desc" as IEPageSortDirection,
      } satisfies IPoliticsBbsArticle.IRequest,
    });
  typia.assert(complexNonMatchingSearch);

  TestValidator.equals(
    "complex non-matching search returns empty results",
    complexNonMatchingSearch.data.length,
    0,
  );

  // Search with very specific search term
  const specificSearch = await api.functional.politicsBbs.search.articles.index(
    connection,
    {
      body: {
        search: "specifickeyword2024",
        sort: "relevance",
        limit: 10,
      } satisfies IPoliticsBbsArticle.IRequest,
    },
  );
  typia.assert(specificSearch);

  TestValidator.equals(
    "highly specific search returns empty results",
    specificSearch.data.length,
    0,
  );

  // Empty search query (validate structure when empty query is used)
  const emptyQuerySearch =
    await api.functional.politicsBbs.search.articles.index(connection, {
      body: {
        search: "",
        limit: 50,
        page: 1,
      } satisfies IPoliticsBbsArticle.IRequest,
    });
  typia.assert(emptyQuerySearch);

  TestValidator.predicate(
    "empty search query returns valid pagination structure",
    () =>
      emptyQuerySearch.pagination !== null &&
      emptyQuerySearch.pagination !== undefined,
  );

  // Search with minimum limit validation
  const minLimitSearch = await api.functional.politicsBbs.search.articles.index(
    connection,
    {
      body: {
        search: "minimalsearch",
        limit: 1,
        page: 1,
      } satisfies IPoliticsBbsArticle.IRequest,
    },
  );
  typia.assert(minLimitSearch);

  TestValidator.equals(
    "minimum limit search returns empty results",
    minLimitSearch.data.length,
    0,
  );

  // Search with maximum limit (boundary testing)
  const maxLimitSearch = await api.functional.politicsBbs.search.articles.index(
    connection,
    {
      body: {
        search: "maximumlimitsearch",
        limit: 100,
        page: 1,
      } satisfies IPoliticsBbsArticle.IRequest,
    },
  );
  typia.assert(maxLimitSearch);

  TestValidator.equals(
    "maximum limit search returns empty results",
    maxLimitSearch.data.length,
    0,
  );

  // Test boundary page numbers for empty results
  const highPageSearch = await api.functional.politicsBbs.search.articles.index(
    connection,
    {
      body: {
        search: "beyondscopepage999999",
        page: 999999,
        limit: 10,
      } satisfies IPoliticsBbsArticle.IRequest,
    },
  );
  typia.assert(highPageSearch);

  TestValidator.equals(
    "high page number search returns empty results",
    highPageSearch.data.length,
    0,
  );
  TestValidator.equals(
    "high page number retains requested page",
    highPageSearch.pagination.current,
    999999,
  );
}
