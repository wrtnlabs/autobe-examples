import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test sorting member activity by newest first.
 *
 * This test validates that the member activity API correctly processes the
 * sort_by='newest' parameter and returns activity data in the expected
 * paginated format. Since the API returns aggregate activity metrics rather
 * than individual timestamped items, the test focuses on:
 *
 * 1. Verifying the API accepts the sort_by='newest' parameter
 * 2. Confirming the response structure is valid and properly typed
 * 3. Ensuring pagination metadata is correctly formatted
 *
 * Note: The response type IRedditCommunityGuest contains aggregate metrics
 * (total posts, comments, karma) rather than individual activity items with
 * timestamps, so chronological ordering validation is not applicable.
 */
export async function test_api_member_activity_sorting_newest_first(
  connection: api.IConnection,
) {
  // Generate a random username for testing
  const username = RandomGenerator.name(1);

  // Prepare request body with sort_by set to 'newest'
  const requestBody = {
    page: 1,
    limit: 10,
    sort_by: "newest" as const,
  } satisfies IRedditCommunityGuest.IActivityRequest;

  // Call the member activity API with newest sorting
  const activityPage: IPageIRedditCommunityGuest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: username,
      body: requestBody,
    });

  // Validate the complete response structure and all nested properties
  // This single assertion performs COMPLETE validation of all type aspects
  typia.assert(activityPage);
}
