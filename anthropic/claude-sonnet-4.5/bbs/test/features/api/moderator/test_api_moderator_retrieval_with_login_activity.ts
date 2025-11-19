import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator retrieval showing accurate login activity tracking.
 *
 * This test validates the login activity tracking functionality for moderator
 * accounts. It creates a moderator account, performs login operations, and
 * verifies that the last_login_at timestamp is accurately updated to reflect
 * authentication events.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account through registration
 * 2. Verify the registered moderator has login tracking initialized
 * 3. Perform a subsequent login operation
 * 4. Retrieve the moderator profile by ID
 * 5. Verify last_login_at field is present and reflects recent login activity
 */
export async function test_api_moderator_retrieval_with_login_activity(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account with initial registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";
  const username = RandomGenerator.alphaNumeric(12);

  const registrationData = {
    email: email,
    password: password,
    username: username,
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  typia.assert(registeredModerator);

  // Step 2: Perform a subsequent login operation
  const loginData = {
    email: email,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  const loggedInModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginData,
    });

  typia.assert(loggedInModerator);

  // Step 3: Retrieve the moderator profile by ID to verify login activity tracking
  const retrievedModerator: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.at(connection, {
      moderatorId: registeredModerator.id,
    });

  typia.assert(retrievedModerator);

  // Step 4: Verify that last_login_at is present and reflects login activity
  TestValidator.predicate(
    "last_login_at should be present after login",
    retrievedModerator.last_login_at !== null &&
      retrievedModerator.last_login_at !== undefined,
  );

  // Step 5: Verify the last_login_at is a valid recent timestamp
  if (retrievedModerator.last_login_at) {
    const lastLoginDate = new Date(retrievedModerator.last_login_at);
    const now = new Date();
    const timeDifferenceMinutes =
      (now.getTime() - lastLoginDate.getTime()) / (1000 * 60);

    TestValidator.predicate(
      "last_login_at should be a recent timestamp within last 5 minutes",
      timeDifferenceMinutes >= 0 && timeDifferenceMinutes < 5,
    );
  }
}
