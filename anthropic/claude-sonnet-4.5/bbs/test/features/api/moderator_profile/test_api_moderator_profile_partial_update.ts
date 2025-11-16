import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test partial update of moderator profile information.
 *
 * This test validates the partial update capability of the moderator profile
 * update endpoint. It ensures that when only specific fields are modified in
 * the update request, other fields remain unchanged.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account with initial username and email
 * 2. Perform a partial update changing only the username field
 * 3. Verify the username was successfully updated to the new value
 * 4. Verify the email remained unchanged from the original value
 * 5. Validate the response structure and data integrity
 * 6. Confirm the partial update mechanism works correctly
 */
export async function test_api_moderator_profile_partial_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialUsername = RandomGenerator.name();

  const createRequestBody = {
    email: initialEmail,
    password: "SecurePassword123!",
    username: initialUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createRequestBody,
    });
  typia.assert(createdModerator);

  // Verify initial moderator data
  TestValidator.equals(
    "created moderator email matches input",
    createdModerator.email,
    initialEmail,
  );
  TestValidator.equals(
    "created moderator username matches input",
    createdModerator.username,
    initialUsername,
  );

  // Step 2: Perform partial update - only change username
  const newUsername = RandomGenerator.name();

  const updateRequestBody = {
    username: newUsername,
  } satisfies IDiscussionBoardModerator.IUpdate;

  const updatedModerator: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorId: createdModerator.id,
        body: updateRequestBody,
      },
    );
  typia.assert(updatedModerator);

  // Step 3: Verify username was updated
  TestValidator.equals(
    "username updated to new value",
    updatedModerator.username,
    newUsername,
  );

  // Step 4: Verify email remained unchanged
  TestValidator.equals(
    "email remained unchanged after partial update",
    updatedModerator.email,
    initialEmail,
  );

  // Step 5: Verify the moderator ID remains the same
  TestValidator.equals(
    "moderator ID unchanged",
    updatedModerator.id,
    createdModerator.id,
  );

  // Step 6: Verify username is different from original
  TestValidator.notEquals(
    "username changed from original",
    updatedModerator.username,
    initialUsername,
  );
}
