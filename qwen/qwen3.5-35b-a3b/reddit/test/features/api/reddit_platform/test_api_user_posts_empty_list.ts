import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test edge case where a user has no posts in the system.
 * Validates empty post list response with correct pagination metadata
 * and filter handling.
 */
export async function test_api_user_posts_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // Create a test user account who has no posts
  // Use a random UUID for the test user
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test 1: Basic empty list without filters
  const emptyResponse = await api.functional.redditPlatform.users.posts.index(
    connection,
    {
      userId,
      body: {},
    },
  );
  typia.assert(emptyResponse);
  // Validate pagination metadata for empty result
  TestValidator.equals(
    "current page should be 1",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be default 20",
    emptyResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "records count should be 0",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    emptyResponse.pagination.pages,
    0,
  );
  // Validate data array is empty
  TestValidator.equals(
    "posts data array should be empty",
    emptyResponse.data.length,
    0,
  );
  // Test 2: Empty list with post_type filter
  const filteredByTypeResponse =
    await api.functional.redditPlatform.users.posts.index(connection, {
      userId,
      body: {
        post_type: "TEXT" as const,
      },
    });
  typia.assert(filteredByTypeResponse);
  TestValidator.equals(
    "empty result with post_type filter",
    filteredByTypeResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records with filter should be 0",
    filteredByTypeResponse.pagination.records,
    0,
  );
  // Test 3: Empty list with date range filter
  const endDate = new Date().toISOString();
  const startDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const filteredByDateResponse =
    await api.functional.redditPlatform.users.posts.index(connection, {
      userId,
      body: {
        start_date: startDate,
        end_date: endDate,
      },
    });
  typia.assert(filteredByDateResponse);
  TestValidator.equals(
    "empty result with date range filter",
    filteredByDateResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records with date filter should be 0",
    filteredByDateResponse.pagination.records,
    0,
  );
  // Test 4: Empty list with search filter
  const filteredBySearchResponse =
    await api.functional.redditPlatform.users.posts.index(connection, {
      userId,
      body: {
        search: RandomGenerator.paragraph({ sentences: 1 }),
      },
    });
  typia.assert(filteredBySearchResponse);
  TestValidator.equals(
    "empty result with search filter",
    filteredBySearchResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records with search filter should be 0",
    filteredBySearchResponse.pagination.records,
    0,
  );
  // Test 5: Empty list with sorting
  const filteredBySortResponse =
    await api.functional.redditPlatform.users.posts.index(connection, {
      userId,
      body: {
        sort_type: "NEW" as const,
        time_range: "ALL" as const,
      },
    });
  typia.assert(filteredBySortResponse);
  TestValidator.equals(
    "empty result with sort filter",
    filteredBySortResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records with sort filter should be 0",
    filteredBySortResponse.pagination.records,
    0,
  );
}
