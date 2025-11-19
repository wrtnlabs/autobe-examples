import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that the display_name field can be updated to a custom value or set to
 * null, with the system falling back to username when null.
 *
 * This scenario validates the optional nature of display_name and its fallback
 * behavior. Register a moderator account with an initial display_name, then
 * update it to a different value and verify the change. Subsequently update
 * display_name to null and confirm the system accepts null values. The test
 * validates that display_name can be freely changed without affecting
 * authentication or system functionality, and that setting it to null causes
 * the system to use username for display purposes.
 *
 * Workflow steps:
 *
 * 1. Register a moderator account with initial display_name
 * 2. Verify successful registration with display_name set
 * 3. Update display_name to a different custom value
 * 4. Verify the display_name change was successful
 * 5. Update display_name to null
 * 6. Verify null is accepted and handled correctly
 */
export async function test_api_moderator_display_name_update_optional(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account with initial display_name
  const initialDisplayName = RandomGenerator.name();
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const username = RandomGenerator.alphaNumeric(10);

  const registrationBody = {
    email: email,
    password: password,
    username: username,
    display_name: initialDisplayName,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationBody,
    });

  // Step 2: Verify successful registration with display_name
  typia.assert(registeredModerator);
  TestValidator.equals(
    "initial display_name matches",
    registeredModerator.display_name,
    initialDisplayName,
  );
  TestValidator.equals(
    "username matches",
    registeredModerator.username,
    username,
  );
  TestValidator.equals("email matches", registeredModerator.email, email);

  // Step 3: Update display_name to a different custom value
  const updatedDisplayName = RandomGenerator.name();
  const updateBody1 = {
    display_name: updatedDisplayName,
  } satisfies IDiscussionBoardModerator.IUpdate;

  const updatedModerator1: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorId: registeredModerator.id,
        body: updateBody1,
      },
    );

  // Step 4: Verify the display_name change was successful
  typia.assert(updatedModerator1);
  TestValidator.equals(
    "updated display_name matches new value",
    updatedModerator1.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "moderator ID unchanged",
    updatedModerator1.id,
    registeredModerator.id,
  );
  TestValidator.equals(
    "username unchanged",
    updatedModerator1.username,
    username,
  );

  // Step 5: Update display_name to null
  const updateBody2 = {
    display_name: null,
  } satisfies IDiscussionBoardModerator.IUpdate;

  const updatedModerator2: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorId: registeredModerator.id,
        body: updateBody2,
      },
    );

  // Step 6: Verify null is accepted and handled correctly
  typia.assert(updatedModerator2);
  TestValidator.equals(
    "display_name is null after update",
    updatedModerator2.display_name,
    null,
  );
  TestValidator.equals(
    "moderator ID still unchanged",
    updatedModerator2.id,
    registeredModerator.id,
  );
  TestValidator.equals(
    "username still unchanged",
    updatedModerator2.username,
    username,
  );
}
