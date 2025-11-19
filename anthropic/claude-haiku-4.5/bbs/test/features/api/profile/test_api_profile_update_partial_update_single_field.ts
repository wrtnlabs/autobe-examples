import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test partial update capability for user profile.
 *
 * Verifies that the profile update endpoint correctly handles partial updates
 * where only a single field is provided in the request body. Tests confirm
 * that:
 *
 * - Updating only email without username successfully updates just the email
 *   field
 * - Updating only username without email successfully updates just the username
 *   field
 * - Response reflects selective updates accurately
 * - System supports flexible partial updates for user convenience
 * - Other fields remain unchanged when not included in update request
 */
export async function test_api_profile_update_partial_update_single_field(
  connection: api.IConnection,
) {
  // Test 1: Update only email field
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updateEmailOnly = {
    email: newEmail,
  } satisfies IDiscussionBoardUser.IUpdate;

  const responseAfterEmailUpdate = await api.functional.my.profile.update(
    connection,
    {
      body: updateEmailOnly,
    },
  );
  typia.assert(responseAfterEmailUpdate);

  // Verify email was updated
  TestValidator.equals(
    "email should be updated to new value",
    responseAfterEmailUpdate.email,
    newEmail,
  );

  // Test 2: Update only username field
  const newUsername = RandomGenerator.alphabets(6);
  const updateUsernameOnly = {
    username: newUsername,
  } satisfies IDiscussionBoardUser.IUpdate;

  const responseAfterUsernameUpdate = await api.functional.my.profile.update(
    connection,
    {
      body: updateUsernameOnly,
    },
  );
  typia.assert(responseAfterUsernameUpdate);

  // Verify username was updated
  TestValidator.equals(
    "username should be updated to new value",
    responseAfterUsernameUpdate.username,
    newUsername,
  );

  // Verify email from previous update is preserved
  TestValidator.equals(
    "email should remain unchanged from previous update",
    responseAfterUsernameUpdate.email,
    newEmail,
  );

  // Test 3: Update only email again to confirm flexibility
  const anotherNewEmail = typia.random<string & tags.Format<"email">>();
  const updateEmailOnlyAgain = {
    email: anotherNewEmail,
  } satisfies IDiscussionBoardUser.IUpdate;

  const responseAfterSecondEmailUpdate = await api.functional.my.profile.update(
    connection,
    {
      body: updateEmailOnlyAgain,
    },
  );
  typia.assert(responseAfterSecondEmailUpdate);

  // Verify latest email update
  TestValidator.equals(
    "email should be updated to new value again",
    responseAfterSecondEmailUpdate.email,
    anotherNewEmail,
  );

  // Verify username from previous update is preserved
  TestValidator.equals(
    "username should remain unchanged from previous update",
    responseAfterSecondEmailUpdate.username,
    newUsername,
  );
}
