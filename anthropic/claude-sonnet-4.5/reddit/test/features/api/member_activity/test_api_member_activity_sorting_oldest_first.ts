import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test member activity retrieval with oldest-first sorting parameter.
 *
 * This test validates that the member activity API accepts the sort_by='oldest'
 * parameter and returns properly structured aggregate activity statistics.
 *
 * Note: The API returns aggregate statistics (IRedditCommunityGuest) containing
 * total counts and karma scores, not individual timestamped activity items.
 * Therefore, this test validates the API's ability to accept sorting parameters
 * and return valid aggregate data structures.
 *
 * Steps:
 *
 * 1. Generate a random test username
 * 2. Call the member activity API with sort_by='oldest' parameter
 * 3. Validate the response structure and type safety
 * 4. Verify pagination metadata is properly formed
 * 5. Validate that aggregate statistics have correct data types and constraints
 */
export async function test_api_member_activity_sorting_oldest_first(
  connection: api.IConnection,
) {
  // Generate a random username for the test
  const testUsername: string = RandomGenerator.name(1);

  // Call the API to retrieve member activity with oldest-first sorting
  const activityResponse: IPageIRedditCommunityGuest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        sort_by: "oldest",
        page: 1,
        limit: 50,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });

  // Validate the complete response structure using typia
  typia.assert(activityResponse);

  // Validate pagination structure is present and well-formed
  TestValidator.predicate(
    "pagination metadata should be present",
    activityResponse.pagination !== null &&
      activityResponse.pagination !== undefined,
  );

  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page should be non-negative",
    activityResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    activityResponse.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    activityResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    activityResponse.pagination.pages >= 0,
  );

  // Validate data array is present
  TestValidator.predicate(
    "data array should be present and be an array",
    Array.isArray(activityResponse.data),
  );

  // Validate each aggregate statistics object in the response
  if (activityResponse.data.length > 0) {
    for (let i = 0; i < activityResponse.data.length; i++) {
      const guestStats = activityResponse.data[i];

      // Validate that total_posts is non-negative
      TestValidator.predicate(
        `guest stats at index ${i} should have non-negative total_posts`,
        guestStats.total_posts >= 0,
      );

      // Validate that total_comments is non-negative
      TestValidator.predicate(
        `guest stats at index ${i} should have non-negative total_comments`,
        guestStats.total_comments >= 0,
      );

      // Validate that total_karma is an integer (can be negative)
      TestValidator.predicate(
        `guest stats at index ${i} should have valid total_karma`,
        Number.isInteger(guestStats.total_karma),
      );

      // Validate that post_karma is an integer
      TestValidator.predicate(
        `guest stats at index ${i} should have valid post_karma`,
        Number.isInteger(guestStats.post_karma),
      );

      // Validate that comment_karma is an integer
      TestValidator.predicate(
        `guest stats at index ${i} should have valid comment_karma`,
        Number.isInteger(guestStats.comment_karma),
      );

      // Validate karma relationship: total should equal post + comment karma
      TestValidator.equals(
        `guest stats at index ${i} total_karma should equal sum of post_karma and comment_karma`,
        guestStats.total_karma,
        guestStats.post_karma + guestStats.comment_karma,
      );
    }
  }

  // Validate that the API accepted the sort_by parameter successfully
  TestValidator.predicate(
    "API should successfully process sort_by parameter and return valid data",
    activityResponse.data !== null && activityResponse.data !== undefined,
  );
}
