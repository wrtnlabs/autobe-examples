import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test partial update of moderator profile fields.
 *
 * This test validates that the moderator update endpoint supports partial
 * updates where only specific fields are provided, allowing moderators to
 * update individual profile attributes without providing all fields. The test
 * creates a moderator account through registration, then performs multiple
 * partial update operations - first updating only the email field, then only
 * the username, then only the display_name, and finally only the password.
 * After each partial update, the test verifies that only the intended field was
 * modified while all other fields remain unchanged from their previous values.
 * This ensures that all fields in IDiscussionBoardModerator.IUpdate are truly
 * optional and can be independently updated without requiring the full set of
 * moderator profile data.
 */
export async function test_api_moderator_partial_update_optional_fields(
  connection: api.IConnection,
) {
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialUsername = RandomGenerator.alphaNumeric(10);
  const initialDisplayName = RandomGenerator.name(2);
  const initialPassword = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: initialEmail,
      password: initialPassword,
      username: initialUsername,
      display_name: initialDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  const newEmail = typia.random<string & tags.Format<"email">>();
  const updatedWithEmail =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          email: newEmail,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(updatedWithEmail);
  TestValidator.equals("email updated", updatedWithEmail.email, newEmail);
  TestValidator.equals(
    "username unchanged after email update",
    updatedWithEmail.username,
    initialUsername,
  );
  TestValidator.equals(
    "display_name unchanged after email update",
    updatedWithEmail.display_name,
    initialDisplayName,
  );

  const newUsername = RandomGenerator.alphaNumeric(10);
  const updatedWithUsername =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          username: newUsername,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(updatedWithUsername);
  TestValidator.equals(
    "username updated",
    updatedWithUsername.username,
    newUsername,
  );
  TestValidator.equals(
    "email unchanged after username update",
    updatedWithUsername.email,
    newEmail,
  );
  TestValidator.equals(
    "display_name unchanged after username update",
    updatedWithUsername.display_name,
    initialDisplayName,
  );

  const newDisplayName = RandomGenerator.name(3);
  const updatedWithDisplayName =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          display_name: newDisplayName,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(updatedWithDisplayName);
  TestValidator.equals(
    "display_name updated",
    updatedWithDisplayName.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "email unchanged after display_name update",
    updatedWithDisplayName.email,
    newEmail,
  );
  TestValidator.equals(
    "username unchanged after display_name update",
    updatedWithDisplayName.username,
    newUsername,
  );

  const newPassword = RandomGenerator.alphaNumeric(12);
  const updatedWithPassword =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          password: newPassword,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(updatedWithPassword);
  TestValidator.equals(
    "email unchanged after password update",
    updatedWithPassword.email,
    newEmail,
  );
  TestValidator.equals(
    "username unchanged after password update",
    updatedWithPassword.username,
    newUsername,
  );
  TestValidator.equals(
    "display_name unchanged after password update",
    updatedWithPassword.display_name,
    newDisplayName,
  );
}
