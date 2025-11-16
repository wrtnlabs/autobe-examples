import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test updating a moderator's email address.
 *
 * This test validates the moderator profile email update functionality by:
 *
 * 1. Creating a new moderator account with an initial email address
 * 2. Authenticating as that moderator (automatic via join)
 * 3. Updating the moderator's email to a new valid email address
 * 4. Verifying the email was updated successfully
 * 5. Ensuring email format validation and uniqueness constraints are maintained
 */
export async function test_api_moderator_profile_email_update(
  connection: api.IConnection,
) {
  // Generate random test data
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const newEmail = typia.random<string & tags.Format<"email">>();
  const password = "testPassword123";
  const username = RandomGenerator.name(1);

  // Step 1: Create moderator account with initial email
  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: initialEmail,
        password: password,
        username: username,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Verify initial moderator data
  TestValidator.equals(
    "created moderator email matches initial email",
    createdModerator.email,
    initialEmail,
  );

  // Step 2: Update moderator's email address
  const updatedModerator: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorId: createdModerator.id,
        body: {
          email: newEmail,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(updatedModerator);

  // Step 3: Verify the email was updated successfully
  TestValidator.equals(
    "updated moderator email matches new email",
    updatedModerator.email,
    newEmail,
  );

  // Verify moderator ID remains the same
  TestValidator.equals(
    "moderator ID unchanged after update",
    updatedModerator.id,
    createdModerator.id,
  );

  // Verify username remains the same
  TestValidator.equals(
    "username unchanged after update",
    updatedModerator.username,
    createdModerator.username,
  );
}
