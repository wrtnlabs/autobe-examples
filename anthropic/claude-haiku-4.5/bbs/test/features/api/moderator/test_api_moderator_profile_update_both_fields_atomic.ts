import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test atomic update of both email and username by moderator.
 *
 * Moderator registers with initial credentials, then atomically updates both
 * email and username fields simultaneously. The test validates that both
 * changes are persisted correctly and consistently, ensuring the API handles
 * multi-field updates atomically. Response must contain both updated fields
 * with their new values. This validates API behavior for atomic profile
 * modifications and data consistency.
 *
 * Test flow:
 *
 * 1. Register moderator with initial email and username
 * 2. Prepare update payload with both new email and username
 * 3. Call profile update API with both fields
 * 4. Verify response contains both updated values
 * 5. Validate data consistency of atomic update
 */
export async function test_api_moderator_profile_update_both_fields_atomic(
  connection: api.IConnection,
) {
  // Step 1: Register moderator with initial credentials
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password = "TestPass123!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: initialEmail,
        username: initialUsername,
        password: password,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Prepare new email and username for atomic update
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  // Step 3: Call profile update API with both fields
  const updatedProfile: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {
        email: newEmail,
        username: newUsername,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(updatedProfile);

  // Step 4: Verify response contains both updated values
  TestValidator.equals(
    "updated email matches new email value",
    updatedProfile.email,
    newEmail,
  );
  TestValidator.equals(
    "updated username matches new username value",
    updatedProfile.username,
    newUsername,
  );

  // Step 5: Validate other profile fields remain consistent
  TestValidator.equals(
    "moderator ID unchanged after profile update",
    updatedProfile.id,
    moderator.id,
  );
  TestValidator.predicate(
    "profile is still active after update",
    updatedProfile.accountStatus === "active",
  );
  TestValidator.predicate(
    "updated_at timestamp is present",
    updatedProfile.updatedAt !== undefined && updatedProfile.updatedAt !== null,
  );
}
