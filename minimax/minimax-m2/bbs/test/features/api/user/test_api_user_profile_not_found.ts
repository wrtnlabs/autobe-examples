import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Test behavior when attempting to retrieve profile for non-existent user in
 * the economic/political discussion board system.
 *
 * Validates proper error handling and HTTP status codes for invalid user ID
 * requests. This ensures the discussion board system gracefully handles
 * requests for non-existent users and returns appropriate error responses
 * rather than crashes or invalid data.
 */
export async function test_api_user_profile_not_found(
  connection: api.IConnection,
) {
  // Generate a random UUID that doesn't correspond to any existing user
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve profile for non-existent user
  // Should throw an error due to invalid user ID
  await TestValidator.error(
    "retrieving non-existent user profile should fail",
    async () => {
      await api.functional.econPoliticalDiscussion.users.at(connection, {
        userId: nonExistentUserId,
      });
    },
  );
}
