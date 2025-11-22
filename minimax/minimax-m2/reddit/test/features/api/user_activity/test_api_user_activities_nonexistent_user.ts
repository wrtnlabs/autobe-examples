import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import type { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";

/**
 * Test API behavior when requesting activities for a user that doesn't exist.
 *
 * This test validates that the user activities endpoint properly handles
 * requests for non-existent user IDs with appropriate error responses. It
 * ensures the system returns meaningful error messages without exposing
 * sensitive internal information or causing system failures when attempting to
 * access activity data for users who don't exist in the database.
 *
 * The test generates a valid UUID format user ID that doesn't exist in the
 * system and submits a complete, valid request body to verify the error is
 * specifically due to the missing user ID rather than malformed request
 * parameters.
 */
export async function test_api_user_activities_nonexistent_user(
  connection: api.IConnection,
) {
  // Generate a non-existent user ID using valid UUID format
  const nonExistentUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Construct a complete, valid request body with all optional parameters
  // to ensure the error is specifically due to non-existent user ID
  const validRequestBody: IRedditPlatformUserActivity.IRequest = {
    activity_type: "post_created,comment_created,post_voted", // Multiple activity types
    community_id: typia.random<string & tags.Format<"uuid">>(),
    target_id: typia.random<string & tags.Format<"uuid">>(),
    date_from: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    date_to: new Date().toISOString(), // Today
    page: 1,
    limit: 20,
    order_by: "created_at",
    order_direction: "desc",
  };

  // Test that the API properly handles non-existent user ID with appropriate error
  await TestValidator.error(
    "requesting activities for non-existent user should return appropriate error",
    async () => {
      await api.functional.redditPlatform.users.activities.index(connection, {
        userId: nonExistentUserId,
        body: validRequestBody,
      });
    },
  );
}
