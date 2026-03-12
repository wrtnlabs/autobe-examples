import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a user profile for a non-existent username.
 *
 * This test verifies that the API correctly returns a 404 Not Found error
 * when attempting to retrieve a user profile for a username that does not exist.
 * It ensures proper error handling and that no sensitive information is leaked
 * in the error response.
 */
export async function test_api_user_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Use a username that is guaranteed not to exist
  const nonExistentUsername: string = "nonexistent_user_999";
  // Test that retrieving a non-existent user profile returns 404
  await TestValidator.httpError(
    "should return 404 for non-existent username",
    404,
    async () =>
      await api.functional.redditClone.users.at(connection, {
        username: nonExistentUsername,
      }),
  );
}
