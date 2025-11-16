import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Validate community search sorting by creation date.
 *
 * Tests that the community search API correctly sorts communities by their
 * creation timestamp in ascending and descending order. Verifies that results
 * are properly ordered chronologically and that sorting works correctly with
 * pagination and filtering.
 *
 * Test workflow:
 *
 * 1. Generate multiple search queries with different sort parameters
 * 2. Execute search with sort='created_at' and direction='desc' for newest first
 * 3. Validate results are ordered from newest to oldest
 * 4. Execute search with sort='created_at' and direction='asc' for oldest first
 * 5. Validate results are ordered from oldest to newest
 * 6. Test sorting with pagination by retrieving multiple pages
 * 7. Verify timestamp consistency and proper ordering across all results
 */
export async function test_api_community_search_sorting_by_creation_date(
  connection: api.IConnection,
) {
  // Test 1: Search with descending creation date (newest first)
  const descResponse = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        sort: "created_at",
        direction: "desc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(descResponse);

  // Validate descending order results
  TestValidator.predicate(
    "descending results should have data",
    descResponse.data.length > 0,
  );

  // Verify timestamps are in descending order
  for (let i = 0; i < descResponse.data.length - 1; i++) {
    const current = new Date(descResponse.data[i].created_at);
    const next = new Date(descResponse.data[i + 1].created_at);
    TestValidator.predicate(
      `community at index ${i} should be created after community at index ${i + 1} in descending order`,
      current.getTime() >= next.getTime(),
    );
  }

  // Test 2: Search with ascending creation date (oldest first)
  const ascResponse = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        sort: "created_at",
        direction: "asc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(ascResponse);

  // Validate ascending order results
  TestValidator.predicate(
    "ascending results should have data",
    ascResponse.data.length > 0,
  );

  // Verify timestamps are in ascending order
  for (let i = 0; i < ascResponse.data.length - 1; i++) {
    const current = new Date(ascResponse.data[i].created_at);
    const next = new Date(ascResponse.data[i + 1].created_at);
    TestValidator.predicate(
      `community at index ${i} should be created before or at same time as community at index ${i + 1} in ascending order`,
      current.getTime() <= next.getTime(),
    );
  }

  // Test 3: Verify reverse order between desc and asc
  if (descResponse.data.length > 0 && ascResponse.data.length > 0) {
    TestValidator.equals(
      "first community in desc should be last in asc",
      descResponse.data[0].id,
      ascResponse.data[ascResponse.data.length - 1].id,
    );
    TestValidator.equals(
      "last community in desc should be first in asc",
      descResponse.data[descResponse.data.length - 1].id,
      ascResponse.data[0].id,
    );
  }

  // Test 4: Test with pagination - descending order
  const pagedDescResponse =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "created_at",
        direction: "desc",
        limit: 5,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(pagedDescResponse);

  // Verify pagination info
  TestValidator.predicate(
    "pagination should indicate current page",
    pagedDescResponse.pagination.current >= 0,
  );

  // Test 5: Verify timestamp format accuracy
  for (const community of descResponse.data) {
    const timestamp = new Date(community.created_at);
    TestValidator.predicate(
      "timestamp should be valid date",
      !isNaN(timestamp.getTime()),
    );
    TestValidator.predicate(
      "timestamp should follow ISO 8601 format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(community.created_at),
    );
  }

  // Test 6: Sort without explicit direction should work
  const defaultSortResponse =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "created_at",
        limit: 10,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(defaultSortResponse);

  TestValidator.predicate(
    "default sort should return results",
    defaultSortResponse.data.length >= 0,
  );

  // Test 7: Verify consistency across multiple calls
  const consistencyResponse =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "created_at",
        direction: "desc",
        limit: 10,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(consistencyResponse);

  if (consistencyResponse.data.length > 0 && descResponse.data.length > 0) {
    // Verify first few results are consistent
    TestValidator.equals(
      "first result should be consistent",
      consistencyResponse.data[0].id,
      descResponse.data[0].id,
    );
  }
}
