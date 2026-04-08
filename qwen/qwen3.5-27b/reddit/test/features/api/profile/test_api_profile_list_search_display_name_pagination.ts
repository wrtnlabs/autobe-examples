import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneUserProfile";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test display name search functionality with pagination across multiple pages.
 *
 * Validates the complete profile search workflow including case-insensitive partial matching, pagination metadata accuracy, and filter combination. Ensures that search results maintain consistency across pages and that pagination correctly reflects the filtered dataset.
 *
 * Special attention is given to verifying that pagination metadata (current page, total pages, total records) accurately reflects the search results, and that the search filter is consistently applied across all pages.
 *
 * 1. Search for profiles with display name containing 'john' using limit=5.
 * 2. Verify all returned profiles have display names containing the search term (case-insensitive).
 * 3. Verify pagination metadata shows correct current page, total pages, and records count.
 * 4. Request page 2 with the same search term and verify all profiles still match.
 * 5. Test sorting by createdAt to verify profiles are sorted by account creation date.
 * 6. Test empty search results with a unique search term that matches no profiles.
 * 7. Verify empty results return data=[], records=0, and pages=0.
 * 8. Test search combined with karma filter (karmaMin=0) to verify filter combination works.
 */
export async function test_api_profile_list_search_display_name_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Search for profiles with display name containing 'john'
  const search1 = await api.functional.redditClone.profiles.index(connection, {
    body: {
      search: "john",
      limit: 5,
      page: 1,
    } satisfies IRedditCloneUserProfile.IRequest,
  });
  typia.assert(search1);
  // 2. Verify all returned profiles have display names containing 'john' (case-insensitive)
  for (const profile of search1.data) {
    TestValidator.predicate(
      `profile ${profile.id} display_name contains 'john'`,
      profile.display_name.toLowerCase().includes("john"),
    );
  }
  // 3. Verify pagination metadata
  TestValidator.equals(
    "page 1 current page is 1",
    search1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit is 5", search1.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 records count is non-negative",
    search1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages count is consistent with records",
    search1.pagination.pages ===
      Math.ceil(search1.pagination.records / search1.pagination.limit),
  );
  // 4. Request page 2 with the same search term
  const hasMultiplePages = search1.pagination.pages >= 2;
  if (hasMultiplePages) {
    const search2 = await api.functional.redditClone.profiles.index(
      connection,
      {
        body: {
          search: "john",
          limit: 5,
          page: 2,
        } satisfies IRedditCloneUserProfile.IRequest,
      },
    );
    typia.assert(search2);
    // Verify all profiles on page 2 still match the search term
    for (const profile of search2.data) {
      TestValidator.predicate(
        `page 2 profile ${profile.id} display_name contains 'john'`,
        profile.display_name.toLowerCase().includes("john"),
      );
    }
    // Verify pagination metadata for page 2
    TestValidator.equals(
      "page 2 current page is 2",
      search2.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 total pages matches page 1",
      search2.pagination.pages,
      search1.pagination.pages,
    );
    TestValidator.equals(
      "page 2 total records matches page 1",
      search2.pagination.records,
      search1.pagination.records,
    );
  }
  // 5. Test sorting by createdAt
  const searchSorted = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        search: "john",
        limit: 5,
        page: 1,
        sortBy: "createdAt",
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(searchSorted);
  // Verify profiles are sorted by createdAt (newest first)
  if (searchSorted.data.length > 1) {
    for (let i = 0; i < searchSorted.data.length - 1; i++) {
      const current = new Date(searchSorted.data[i].created_at);
      const next = new Date(searchSorted.data[i + 1].created_at);
      TestValidator.predicate(
        `profile ${i} created_at >= profile ${i + 1} created_at`,
        current >= next,
      );
    }
  }
  // 6. Test empty search results with a unique search term
  const emptySearch = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        search: typia.random<string & tags.Format<"uuid">>(),
        limit: 10,
        page: 1,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(emptySearch);
  // 7. Verify empty results return data=[], records=0, and pages=0
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "empty search records is 0",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search pages is 0",
    emptySearch.pagination.pages,
    0,
  );
  // 8. Test search combined with karma filter (karmaMin=0)
  const searchWithKarma = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        search: "john",
        limit: 5,
        page: 1,
        karmaMin: 0,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(searchWithKarma);
  // Verify all returned profiles have karma >= 0
  for (const profile of searchWithKarma.data) {
    TestValidator.predicate(
      `profile ${profile.id} karma >= 0`,
      profile.karma >= 0,
    );
    TestValidator.predicate(
      `profile ${profile.id} display_name contains 'john'`,
      profile.display_name.toLowerCase().includes("john"),
    );
  }
  // Verify that karma filter may reduce the total records
  TestValidator.predicate(
    "karma filter records <= original search records",
    searchWithKarma.pagination.records <= search1.pagination.records,
  );
}
