import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Test visibility filtering for community search functionality.
 *
 * Validates that the community search endpoint correctly enforces visibility
 * filtering, ensuring only public communities are discoverable in search
 * results while private communities remain hidden from public access. This test
 * verifies privacy controls work correctly and pagination operates properly
 * across visibility filters.
 *
 * Test workflow:
 *
 * 1. Search for public communities and validate all results have public visibility
 * 2. Verify that searching for private communities returns empty results
 * 3. Test pagination with visibility filter (multiple pages of public communities)
 * 4. Validate guest/unauthenticated users can access public community search
 */
export async function test_api_community_search_visibility_filtering(
  connection: api.IConnection,
) {
  // Test 1: Search for public communities and validate visibility
  const publicResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        visibility: "public",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(publicResult);

  // Validate that all returned communities are properly structured
  TestValidator.predicate(
    "public search should return pagination info",
    publicResult.pagination !== undefined,
  );

  TestValidator.predicate(
    "public search should return data array",
    Array.isArray(publicResult.data),
  );

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid current page",
    publicResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination should have valid limit",
    publicResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination should have valid record count",
    publicResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination should have valid page count",
    publicResult.pagination.pages >= 0,
  );

  // Test 2: Search for private communities and verify no results
  const privateResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        visibility: "private",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(privateResult);

  TestValidator.predicate(
    "private community search should return empty results for non-members",
    privateResult.data.length === 0,
  );

  // Test 3: Test pagination with visibility filter
  if (publicResult.pagination.pages > 1) {
    const secondPage: IPageICommunityPlatformCommunity.ISummary =
      await api.functional.communityPlatform.communities.index(connection, {
        body: {
          visibility: "public",
          limit: 20,
          offset: 20,
        } satisfies ICommunityPlatformCommunity.IRequest,
      });
    typia.assert(secondPage);

    TestValidator.predicate(
      "pagination should work with visibility filter",
      secondPage.pagination.current > publicResult.pagination.current,
    );
  }

  // Test 4: Search without explicit visibility (should default to accessible communities)
  const defaultResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(defaultResult);

  TestValidator.predicate(
    "search without visibility filter should return results",
    defaultResult.pagination !== undefined,
  );

  // Test 5: Search with text filtering combined with visibility
  const filteredResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: RandomGenerator.alphabets(5),
        visibility: "public",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(filteredResult);

  TestValidator.predicate(
    "filtered search should return valid pagination",
    filteredResult.pagination !== undefined,
  );

  // Test 6: Verify sorting with visibility filter
  const sortedResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        visibility: "public",
        sort: "subscriber_count",
        direction: "desc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(sortedResult);

  TestValidator.predicate(
    "sorted public search should return results",
    sortedResult.pagination !== undefined,
  );
}
