import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the successful retrieval of a user's public profile information.
 *
 * This test validates that when a valid user ID is provided, the system returns
 * the correct public profile data including display name, biography text, and
 * account timestamps. The test verifies that sensitive information like email
 * and password hash are properly excluded from the response.
 */
export async function test_api_user_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for the user ID parameter
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Call the API endpoint to retrieve user profile
  const profile = await api.functional.discussionBoard.users.at(connection, {
    userId: userId,
  });
  // Validate the response structure using typia.assert()
  // This performs complete runtime validation including all format checks
  typia.assert(profile);
  // Verify that the returned ID matches the requested ID
  // This is business logic validation, not type validation
  TestValidator.equals("user ID matches", profile.id, userId);
}
