import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that updating a moderator's email address correctly resets the
 * email_verified flag to false.
 *
 * This test validates the security requirement that email changes require
 * re-verification. When a moderator updates their email address, the system
 * must reset the email_verified flag to false and clear the email_verified_at
 * timestamp to ensure the new email is verified before granting full moderation
 * privileges.
 *
 * Test workflow:
 *
 * 1. Register a new moderator account with initial email
 * 2. Update the moderator's email to a new valid email address
 * 3. Verify that email_verified is set to false after the update
 * 4. Verify that email_verified_at is reset to null
 * 5. Verify that the new email address is correctly stored
 */
export async function test_api_moderator_email_update_verification_reset(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const username = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();

  const registrationBody = {
    email: initialEmail,
    password: password,
    username: username,
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationBody,
    });

  typia.assert(registeredModerator);

  // Step 2: Update the moderator's email to a new email address
  const newEmail = typia.random<string & tags.Format<"email">>();

  const updateBody = {
    email: newEmail,
  } satisfies IDiscussionBoardModerator.IUpdate;

  const updatedModerator: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorId: registeredModerator.id,
        body: updateBody,
      },
    );

  typia.assert(updatedModerator);

  // Step 3: Verify that email_verified is set to false after the email change
  TestValidator.equals(
    "email_verified should be false after email update",
    updatedModerator.email_verified,
    false,
  );

  // Step 4: Verify that email_verified_at is reset to null
  TestValidator.equals(
    "email_verified_at should be null after email update",
    updatedModerator.email_verified_at,
    null,
  );

  // Step 5: Verify that the new email address is correctly stored
  TestValidator.equals(
    "email should be updated to the new email address",
    updatedModerator.email,
    newEmail,
  );
}
