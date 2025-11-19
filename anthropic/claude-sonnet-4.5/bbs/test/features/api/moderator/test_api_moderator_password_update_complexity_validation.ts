import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test password update complexity validation for moderator accounts.
 *
 * This test validates that the password update functionality properly accepts
 * passwords meeting complexity requirements (minimum 8 characters with at least
 * one letter and one number). It creates a moderator account and updates the
 * password with a compliant value, verifying the operation succeeds.
 *
 * Steps:
 *
 * 1. Register a new moderator account with initial compliant password
 * 2. Update the moderator password to a new compliant password
 * 3. Verify the update succeeded and moderator data is correctly returned
 */
export async function test_api_moderator_password_update_complexity_validation(
  connection: api.IConnection,
) {
  const initialPassword = "initial123";
  const newPassword = "newPass456";

  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();

  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: initialPassword,
        username: moderatorUsername,
        display_name: displayName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(registeredModerator);

  TestValidator.equals(
    "registered moderator email matches input",
    registeredModerator.email,
    moderatorEmail,
  );

  TestValidator.equals(
    "registered moderator username matches input",
    registeredModerator.username,
    moderatorUsername,
  );

  const updatedModerator: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorId: registeredModerator.id,
        body: {
          password: newPassword,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(updatedModerator);

  TestValidator.equals(
    "moderator ID remains unchanged after password update",
    updatedModerator.id,
    registeredModerator.id,
  );

  TestValidator.equals(
    "moderator email remains unchanged after password update",
    updatedModerator.email,
    moderatorEmail,
  );

  TestValidator.equals(
    "moderator username remains unchanged after password update",
    updatedModerator.username,
    moderatorUsername,
  );

  TestValidator.predicate(
    "updated_at timestamp should be present",
    updatedModerator.updated_at !== null &&
      updatedModerator.updated_at !== undefined,
  );
}
