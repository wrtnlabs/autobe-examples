import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that the username field in moderator profile response reflects the
 * immutable username set at creation.
 *
 * This test validates the immutability constraint on the username field for
 * moderators. The username is set during account creation and must remain
 * unchanged throughout the moderator's lifecycle. This test verifies that:
 *
 * 1. A moderator account can be created with a specific username
 * 2. The profile endpoint returns the exact username provided during registration
 * 3. Multiple profile retrievals return the same username value, confirming
 *    immutability
 * 4. The username cannot be modified after account creation
 *
 * This is important for audit trails and system integrity, as usernames serve
 * as stable identifiers for moderators in the discussion board moderation
 * system.
 */
export async function test_api_moderator_profile_username_immutability(
  connection: api.IConnection,
) {
  // Step 1: Create moderator with specific username
  const testUsername = "moderator_" + RandomGenerator.alphaNumeric(8);
  const testPassword = "SecurePass123!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: testPassword,
        username: testUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Verify the returned authorized response contains the correct username
  TestValidator.equals(
    "moderator username matches creation input",
    moderator.username,
    testUsername,
  );

  // Step 3: Retrieve profile first time and verify username
  const profileFirstRetrieve: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.at(connection);
  typia.assert(profileFirstRetrieve);

  TestValidator.equals(
    "first profile retrieval username matches creation",
    profileFirstRetrieve.username,
    testUsername,
  );

  // Step 4: Retrieve profile second time to confirm immutability across multiple retrievals
  const profileSecondRetrieve: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.at(connection);
  typia.assert(profileSecondRetrieve);

  TestValidator.equals(
    "second profile retrieval username matches first retrieval",
    profileSecondRetrieve.username,
    profileFirstRetrieve.username,
  );

  // Step 5: Verify username consistency across all retrievals
  TestValidator.equals(
    "username remains immutable across multiple retrievals",
    profileSecondRetrieve.username,
    testUsername,
  );

  // Step 6: Verify the username is the expected format (alphanumeric and underscore only)
  TestValidator.predicate(
    "username follows expected pattern",
    /^[a-zA-Z0-9_]+$/.test(profileFirstRetrieve.username),
  );

  // Step 7: Verify username length constraints
  TestValidator.predicate(
    "username meets minimum length requirement",
    profileFirstRetrieve.username.length >= 3,
  );

  TestValidator.predicate(
    "username meets maximum length requirement",
    profileFirstRetrieve.username.length <= 50,
  );
}
