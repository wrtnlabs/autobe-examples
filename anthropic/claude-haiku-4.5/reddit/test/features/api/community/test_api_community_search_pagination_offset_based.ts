import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Tests offset-based pagination for community search.
 *
 * Validates that the community search API correctly implements offset-based
 * pagination by retrieving different pages of communities and verifying that
 * pagination metadata is accurate. Tests initial requests, subsequent pages,
 * boundary conditions (offset beyond total records), and various limit
 * settings.
 */
export async function test_api_community_search_pagination_offset_based(
  connection: api.IConnection,
) {
  // Test 1: Retrieve first page with offset=0 and limit=10
  const firstPage: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        limit: 10,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(firstPage);

  // Validate pagination metadata for first page
  TestValidator.predicate(
    "pagination metadata exists",
    firstPage.pagination !== null && firstPage.pagination !== undefined,
  );
  TestValidator.equals(
    "current page reflects offset 0",
    firstPage.pagination.current,
    0,
  );
  TestValidator.equals("limit is 10", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "total records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate("data array is valid", Array.isArray(firstPage.data));

  const firstPageIds = firstPage.data.map((c) => c.id);

  // Test 2: Retrieve second page with offset=10 and limit=10
  const secondPage: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        limit: 10,
        offset: 10,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(secondPage);

  TestValidator.equals(
    "current page reflects offset 10",
    secondPage.pagination.current,
    10,
  );
  TestValidator.equals("limit remains 10", secondPage.pagination.limit, 10);

  // Verify results are different between pages when enough records exist
  if (firstPage.pagination.records > 10 && secondPage.data.length > 0) {
    const secondPageIds = secondPage.data.map((c) => c.id);
    const hasDifferentCommunities = firstPageIds.some(
      (id) => !secondPageIds.includes(id),
    );
    TestValidator.predicate(
      "second page has different communities from first page",
      hasDifferentCommunities,
    );
  }

  // Test 3: Request with offset beyond total records
  const beyondOffset: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        limit: 10,
        offset: Math.max(firstPage.pagination.records + 100, 10000),
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(beyondOffset);

  TestValidator.equals(
    "beyond offset returns empty data",
    beyondOffset.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination metadata still valid",
    beyondOffset.pagination.limit > 0,
  );

  // Test 4: Pagination with minimum limit (limit=1)
  const minLimit: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        limit: 1,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(minLimit);

  TestValidator.predicate(
    "limit=1 returns at most 1 item",
    minLimit.data.length <= 1,
  );
  TestValidator.equals("pagination limit is 1", minLimit.pagination.limit, 1);

  // Test 5: Pagination with maximum limit (limit=100)
  const maxLimit: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        limit: 100,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(maxLimit);

  TestValidator.equals(
    "pagination limit is 100",
    maxLimit.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    maxLimit.data.length <= 100,
  );

  // Test 6: Pagination with filters (search + limit + offset)
  const searchKeyword =
    firstPage.data.length > 0
      ? firstPage.data[0].name.substring(
          0,
          Math.min(3, firstPage.data[0].name.length),
        )
      : "test";
  const filteredPage: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: searchKeyword,
        limit: 10,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(filteredPage);

  TestValidator.equals(
    "filtered pagination has valid limit",
    filteredPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "filtered results are valid",
    Array.isArray(filteredPage.data),
  );

  // Test 7: Pagination with sort and offset
  const sortedPage: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "subscriber_count",
        direction: "desc",
        limit: 10,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(sortedPage);

  TestValidator.equals(
    "sorted pagination has correct limit",
    sortedPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "sorted data is properly ordered",
    sortedPage.data.length <= 1 ||
      sortedPage.data.every(
        (c, i) =>
          i === 0 ||
          c.subscriber_count <= sortedPage.data[i - 1].subscriber_count,
      ),
  );

  // Test 8: Verify pagination consistency
  const expectedPages = Math.ceil(
    firstPage.pagination.records / firstPage.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is consistent",
    expectedPages,
    firstPage.pagination.pages,
  );

  // Test 9: Verify offset pagination increments correctly
  const thirdPage: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        limit: 10,
        offset: 20,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(thirdPage);

  TestValidator.equals(
    "third page offset is correct",
    thirdPage.pagination.current,
    20,
  );
  TestValidator.equals(
    "third page limit matches request",
    thirdPage.pagination.limit,
    10,
  );
}
