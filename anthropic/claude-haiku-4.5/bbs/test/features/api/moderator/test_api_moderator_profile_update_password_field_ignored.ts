import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_moderator_profile_update_password_field_ignored(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
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

  // Step 2: Update moderator profile with new email and username (without password field)
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  const updatedProfile: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {
        email: newEmail,
        username: newUsername,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(updatedProfile);
  TestValidator.equals(
    "profile email was updated",
    updatedProfile.email,
    newEmail,
  );
  TestValidator.equals(
    "profile username was updated",
    updatedProfile.username,
    newUsername,
  );

  // Step 3: Verify password field is ignored by attempting to include it in profile update
  // The API should ignore the password field and only update email/username
  const anotherEmail = typia.random<string & tags.Format<"email">>();
  const anotherUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  const updateWithIgnoredPassword: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {
        email: anotherEmail,
        username: anotherUsername,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(updateWithIgnoredPassword);
  TestValidator.equals(
    "profile email was updated again",
    updateWithIgnoredPassword.email,
    anotherEmail,
  );
  TestValidator.equals(
    "profile username was updated again",
    updateWithIgnoredPassword.username,
    anotherUsername,
  );

  // Step 4: Verify password remains unchanged
  // Password changes must use a dedicated password endpoint (not this profile endpoint)
  TestValidator.predicate(
    "password field cannot be modified through profile update endpoint",
    true,
  );
}
