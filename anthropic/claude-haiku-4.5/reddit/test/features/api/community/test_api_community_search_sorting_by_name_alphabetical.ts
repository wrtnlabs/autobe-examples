import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Test community search and sorting by name in alphabetical order.
 *
 * Validates that the community search API correctly handles alphabetical
 * sorting with both ascending (A-Z) and descending (Z-A) directions. Tests
 * various combinations including pagination, filtering, and case-insensitive
 * sorting on community display names.
 *
 * Workflow:
 *
 * 1. Search with sort='name' and direction='asc' (A-Z order)
 * 2. Verify communities are returned in alphabetical ascending order
 * 3. Search with sort='name' and direction='desc' (Z-A order)
 * 4. Verify communities are returned in reverse alphabetical order
 * 5. Test pagination combined with alphabetical sorting
 * 6. Validate sorting consistency across multiple requests
 * 7. Test sorting combined with visibility filtering
 * 8. Verify pagination metadata is accurate
 */
export async function test_api_community_search_sorting_by_name_alphabetical(
  connection: api.IConnection,
) {
  // Test 1: Search with ascending alphabetical sort (A-Z)
  const ascendingResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "name",
        direction: "asc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });

  typia.assert(ascendingResult);

  // Validate ascending sort order (A-Z)
  if (ascendingResult.data.length > 1) {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      const current = ascendingResult.data[i].name.toLowerCase();
      const next = ascendingResult.data[i + 1].name.toLowerCase();

      TestValidator.predicate(
        "community names in ascending alphabetical order",
        current <= next,
      );
    }
  }

  // Test 2: Search with descending alphabetical sort (Z-A)
  const descendingResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "name",
        direction: "desc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });

  typia.assert(descendingResult);

  // Validate descending sort order (Z-A)
  if (descendingResult.data.length > 1) {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      const current = descendingResult.data[i].name.toLowerCase();
      const next = descendingResult.data[i + 1].name.toLowerCase();

      TestValidator.predicate(
        "community names in descending alphabetical order",
        current >= next,
      );
    }
  }

  // Test 3: Verify ascending and descending have same count
  TestValidator.equals(
    "ascending and descending results have same total count",
    ascendingResult.data.length,
    descendingResult.data.length,
  );

  // Test 4: Pagination with alphabetical sorting
  const paginatedAscending1: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "name",
        direction: "asc",
        limit: 3,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });

  typia.assert(paginatedAscending1);

  const paginatedAscending2: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "name",
        direction: "asc",
        limit: 3,
        offset: 3,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });

  typia.assert(paginatedAscending2);

  // Validate pagination maintains sort order
  if (
    paginatedAscending1.data.length > 0 &&
    paginatedAscending2.data.length > 0
  ) {
    const lastFromPage1 =
      paginatedAscending1.data[
        paginatedAscending1.data.length - 1
      ].name.toLowerCase();
    const firstFromPage2 = paginatedAscending2.data[0].name.toLowerCase();

    TestValidator.predicate(
      "pagination maintains alphabetical order across pages",
      lastFromPage1 <= firstFromPage2,
    );
  }

  // Test 5: Sorting consistency across requests
  const consistencyTest1: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "name",
        direction: "asc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });

  typia.assert(consistencyTest1);

  const consistencyTest2: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "name",
        direction: "asc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });

  typia.assert(consistencyTest2);

  // Verify same results in same order
  TestValidator.equals(
    "alphabetical sorting is consistent across requests",
    consistencyTest1.data.map((c) => c.id),
    consistencyTest2.data.map((c) => c.id),
  );

  // Test 6: Sorting with visibility filter
  const sortedPublicCommunities: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        visibility: "public",
        sort: "name",
        direction: "asc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });

  typia.assert(sortedPublicCommunities);

  // Validate public communities are still sorted alphabetically
  if (sortedPublicCommunities.data.length > 1) {
    for (let i = 0; i < sortedPublicCommunities.data.length - 1; i++) {
      const current = sortedPublicCommunities.data[i].name.toLowerCase();
      const next = sortedPublicCommunities.data[i + 1].name.toLowerCase();

      TestValidator.predicate(
        "public communities sorted alphabetically",
        current <= next,
      );
    }
  }

  // Test 7: Validate pagination metadata
  TestValidator.predicate(
    "pagination limit is non-negative",
    ascendingResult.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination current page is non-negative",
    ascendingResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "total records count is non-negative",
    ascendingResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages count is non-negative",
    ascendingResult.pagination.pages >= 0,
  );

  // Test 8: Case-insensitive sorting validation
  // Verify that both uppercase and lowercase names sort correctly
  const caseInsensitiveTest: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "name",
        direction: "asc",
        limit: 100,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });

  typia.assert(caseInsensitiveTest);

  if (caseInsensitiveTest.data.length > 1) {
    for (let i = 0; i < caseInsensitiveTest.data.length - 1; i++) {
      const currentName = caseInsensitiveTest.data[i].name;
      const nextName = caseInsensitiveTest.data[i + 1].name;

      TestValidator.predicate(
        "names are case-insensitively sorted",
        currentName.toLowerCase() <= nextName.toLowerCase(),
      );
    }
  }
}
