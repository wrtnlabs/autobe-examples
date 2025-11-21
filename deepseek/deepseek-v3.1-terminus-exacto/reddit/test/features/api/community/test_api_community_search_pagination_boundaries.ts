import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Test pagination boundary conditions including first page, last page, and page
 * size limits. Validates that pagination parameters (page, limit) work
 * correctly with minimum/maximum values and handle edge cases like empty result
 * sets and out-of-bounds page requests.
 */
export async function test_api_community_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // Test minimum page value (page=1) with various limit settings
  const page1Limit10 = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(page1Limit10);
  TestValidator.equals(
    "page 1 limit 10 should have valid pagination",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 10 should have correct limit",
    page1Limit10.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 limit 10 should have non-negative records",
    page1Limit10.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 limit 10 should have non-negative pages",
    page1Limit10.pagination.pages >= 0,
  );

  // Test maximum limit value (limit=100)
  const page1Limit100 =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1 satisfies number as number,
        limit: 100 satisfies number as number,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(page1Limit100);
  TestValidator.equals(
    "page 1 limit 100 should have valid pagination",
    page1Limit100.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 100 should have correct limit",
    page1Limit100.pagination.limit,
    100,
  );

  // Test minimum limit value (limit=1)
  const page1Limit1 = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        page: 1 satisfies number as number,
        limit: 1 satisfies number as number,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(page1Limit1);
  TestValidator.equals(
    "page 1 limit 1 should have valid pagination",
    page1Limit1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 1 should have correct limit",
    page1Limit1.pagination.limit,
    1,
  );

  // Test out-of-bounds page request (page=999999)
  const outOfBoundsPage =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 999999 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(outOfBoundsPage);
  TestValidator.predicate(
    "out-of-bounds page should return empty data array",
    outOfBoundsPage.data.length === 0,
  );
  TestValidator.predicate(
    "out-of-bounds page should have valid pagination metadata",
    outOfBoundsPage.pagination.pages >= 0,
  );

  // Test empty result set with specific search criteria
  const emptyResult = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
        search: "nonexistentcommunitynamethatwillneverexist12345",
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.predicate(
    "empty search result should return empty data array",
    emptyResult.data.length === 0,
  );
  TestValidator.equals(
    "empty search result should have zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search result should have zero pages",
    emptyResult.pagination.pages,
    0,
  );

  // Test pagination metadata consistency
  const consistentPage =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1 satisfies number as number,
        limit: 25 satisfies number as number,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(consistentPage);

  // Validate pagination calculation: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    consistentPage.pagination.records / consistentPage.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation should be correct",
    consistentPage.pagination.pages,
    expectedPages,
  );

  // Test that data array length does not exceed limit
  TestValidator.predicate(
    "data array length should not exceed limit",
    consistentPage.data.length <= consistentPage.pagination.limit,
  );

  // Validate community summary data structure for returned communities
  if (consistentPage.data.length > 0) {
    const community = consistentPage.data[0];
    typia.assert(community);
    TestValidator.predicate(
      "community should have valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        community.id,
      ),
    );
    TestValidator.predicate(
      "community should have non-empty name",
      community.name.length > 0,
    );
    TestValidator.predicate(
      "community should have non-empty slug",
      community.slug.length > 0,
    );
    TestValidator.predicate(
      "community should have valid status",
      ["active", "archived", "suspended", "pending"].includes(community.status),
    );
    TestValidator.predicate(
      "community should have valid privacy",
      ["public", "private", "restricted"].includes(community.privacy),
    );
    TestValidator.predicate(
      "community should have valid created_at timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(community.created_at),
    );
  }
}
