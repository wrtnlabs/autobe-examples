import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that moderator profile data remains consistent across multiple
 * sequential retrieval operations.
 *
 * This test validates data consistency and state stability for moderator
 * accounts. It creates a new moderator account and then retrieves the profile
 * multiple times without any modifications between retrievals to ensure all
 * responses return identical data.
 *
 * Test Flow:
 *
 * 1. Create a new moderator account with valid credentials
 * 2. Retrieve the moderator profile for the first time
 * 3. Retrieve the moderator profile multiple times sequentially without
 *    modifications
 * 4. Compare all retrieved profiles to ensure they are identical
 * 5. Verify that timestamps and all data remain consistent across retrievals
 */
export async function test_api_moderator_profile_multiple_sequential_retrievals(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(8) + "aA1!"; // Ensure complexity
  const moderatorUsername = RandomGenerator.alphabets(8).toLowerCase();

  const createdModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(createdModerator);

  // Step 2: Retrieve the profile for the first time
  const firstRetrieval =
    await api.functional.discussionBoard.moderator.profile.at(connection);
  typia.assert(firstRetrieval);

  // Step 3: Retrieve the profile multiple times sequentially
  const secondRetrieval =
    await api.functional.discussionBoard.moderator.profile.at(connection);
  typia.assert(secondRetrieval);

  const thirdRetrieval =
    await api.functional.discussionBoard.moderator.profile.at(connection);
  typia.assert(thirdRetrieval);

  // Step 4: Validate all retrievals are identical
  TestValidator.equals(
    "first and second profile retrievals should be identical",
    firstRetrieval,
    secondRetrieval,
  );

  TestValidator.equals(
    "second and third profile retrievals should be identical",
    secondRetrieval,
    thirdRetrieval,
  );

  TestValidator.equals(
    "first and third profile retrievals should be identical",
    firstRetrieval,
    thirdRetrieval,
  );

  // Step 5: Verify profile contains expected moderator data
  TestValidator.equals(
    "profile email should match created moderator email",
    firstRetrieval.email,
    moderatorEmail,
  );

  TestValidator.equals(
    "profile username should match created moderator username",
    firstRetrieval.username,
    moderatorUsername,
  );

  TestValidator.predicate(
    "profile account status should be active",
    firstRetrieval.accountStatus === "active",
  );

  TestValidator.predicate(
    "profile moderation tier should be defined",
    firstRetrieval.moderationTier !== null &&
      firstRetrieval.moderationTier !== undefined,
  );

  // Step 6: Verify timestamps are consistent and present
  TestValidator.predicate(
    "created_at timestamp should be a valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstRetrieval.createdAt),
  );

  TestValidator.predicate(
    "updated_at timestamp should be a valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstRetrieval.updatedAt),
  );
}
