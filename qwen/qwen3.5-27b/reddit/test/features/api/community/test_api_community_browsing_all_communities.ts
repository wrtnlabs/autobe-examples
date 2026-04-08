import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test browsing all communities with pagination and sorting validation.
 *
 * Validates the complete community listing functionality including pagination metadata, community summary fields, and sorting behavior. The test verifies that communities are returned with all required fields and that pagination calculations are accurate.
 *
 * Special attention is given to verifying that the endpoint is accessible without authentication and that default sorting (newest first) is applied correctly.
 *
 * 1. Call the communities listing endpoint with default parameters.
 * 2. Validate the response structure includes pagination metadata and community list.
 * 3. Verify pagination metadata (current, limit, records, pages) is correctly calculated.
 * 4. Verify communities are sorted by created_at in descending order (newest first).
 * 5. Test explicit pagination parameters and custom sorting options.
 * 6. Test search functionality with case-insensitive name matching.
 */
export async function test_api_community_browsing_all_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call the communities listing endpoint with default parameters
  const response = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {} satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(response);
  // 2. Validate pagination metadata is present
  TestValidator.predicate(
    "has pagination object",
    response.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(response.data));
  // 3. Verify pagination metadata fields are valid
  TestValidator.predicate(
    "current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate pagination calculation: pages should be ceiling of records/limit
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculation",
    response.pagination.pages,
    expectedPages,
  );
  // 5. If there are communities, validate sorting and business logic
  if (response.data.length > 0) {
    // Verify default sorting (newest first by created_at)
    if (response.data.length > 1) {
      const dates = response.data.map((c) => new Date(c.created_at).getTime());
      const isDescending = dates.every(
        (date, i, arr) => i === 0 || arr[i - 1] >= date,
      );
      TestValidator.predicate(
        "communities sorted by created_at DESC",
        isDescending,
      );
    }
    // Validate subscriber_count is non-negative for all communities
    TestValidator.predicate(
      "all subscriber counts are non-negative",
      response.data.every((c) => c.subscriber_count >= 0),
    );
  }
  // 6. Test with explicit pagination parameters
  const paginatedResponse = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "explicit page 1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "explicit limit 10",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedResponse.data.length <= 10,
  );
  // 7. Test with sorting by subscriber_count
  const sortedBySubscribers =
    await api.functional.redditClone.communities.index(connection, {
      body: {
        sort: "subscriber_count",
        direction: "DESC",
      } satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(sortedBySubscribers);
  if (sortedBySubscribers.data.length > 1) {
    const isSubscriberCountDescending = sortedBySubscribers.data.every(
      (community, i, arr) =>
        i === 0 || arr[i - 1].subscriber_count >= community.subscriber_count,
    );
    TestValidator.predicate(
      "communities sorted by subscriber_count DESC",
      isSubscriberCountDescending,
    );
  }
  // 8. Test with search functionality
  const searchTerm = RandomGenerator.alphabets(3);
  const searchResponse = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        search: searchTerm,
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(searchResponse);
  // All returned communities should contain the search term in their name (case-insensitive)
  TestValidator.predicate(
    "search results match term",
    searchResponse.data.every((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );
}
