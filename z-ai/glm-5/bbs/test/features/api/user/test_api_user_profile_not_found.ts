import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a non-existent user profile.
 *
 * This test validates that when a non-existent user UUID is provided,
 * the API correctly returns a 404 Not Found error with proper error handling.
 *
 * Workflow:
 * 1. Generate a random UUID that doesn't exist in the system
 * 2. Call GET /discussionBoard/users/{userId} with the fake UUID
 * 3. Verify the API throws an HttpError with status 404
 */
export async function test_api_user_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that definitely doesn't exist in the database
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve a user that doesn't exist
  // The API should throw an HttpError with status 404
  await TestValidator.httpError(
    "should return 404 for non-existent user",
    404,
    async () => {
      await api.functional.discussionBoard.users.at(connection, {
        userId: nonExistentUserId,
      });
    },
  );
}
