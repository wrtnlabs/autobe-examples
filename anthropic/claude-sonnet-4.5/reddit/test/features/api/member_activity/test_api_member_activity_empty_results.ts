import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test retrieving activity for a member with no contributions.
 *
 * This test validates the API behavior when querying activity history for a
 * member who has not yet created any posts or comments. It ensures that the API
 * returns a valid response structure with an empty data array and correct
 * pagination metadata reflecting zero records.
 *
 * Steps:
 *
 * 1. Generate a unique username for a non-existent member
 * 2. Request activity with default pagination parameters
 * 3. Validate the response structure is correct
 * 4. Verify the data array is empty
 * 5. Verify pagination metadata shows zero records and pages
 */
export async function test_api_member_activity_empty_results(
  connection: api.IConnection,
) {
  // Generate a unique username that doesn't exist in the system
  const nonExistentUsername = `user_${RandomGenerator.alphaNumeric(16)}`;

  // Request activity for the non-existent member with default pagination
  const activityPage: IPageIRedditCommunityGuest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: nonExistentUsername,
      body: {
        page: 1,
        limit: 10,
      },
    });

  // Validate the response structure
  typia.assert(activityPage);

  // Verify the data array is empty
  TestValidator.equals(
    "data array should be empty for member with no activity",
    activityPage.data.length,
    0,
  );

  // Verify pagination metadata shows zero records
  TestValidator.equals(
    "total records should be 0 for member with no activity",
    activityPage.pagination.records,
    0,
  );

  // Verify pagination metadata shows zero pages
  TestValidator.equals(
    "total pages should be 0 when there are no records",
    activityPage.pagination.pages,
    0,
  );

  // Verify current page is set correctly
  TestValidator.equals(
    "current page should be 0 when no results exist",
    activityPage.pagination.current,
    0,
  );

  // Verify limit is set correctly
  TestValidator.equals(
    "limit should match the requested limit",
    activityPage.pagination.limit,
    10,
  );
}
