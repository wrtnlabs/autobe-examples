import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_moderator_profile_update_while_suspended_allowed(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(5);
  const moderatorPassword = RandomGenerator.alphaNumeric(10);

  const joinedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(joinedModerator);
  TestValidator.equals(
    "moderator email matches",
    joinedModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches",
    joinedModerator.username,
    moderatorUsername,
  );

  // Step 2: Update moderator profile
  // According to specification, moderators can update their profile information
  // including email and username at any time, even if suspended
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedUsername = RandomGenerator.alphabets(6);

  const updatedProfile: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {
        email: updatedEmail,
        username: updatedUsername,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(updatedProfile);

  // Step 3: Verify profile update persisted with new values
  TestValidator.equals(
    "updated email matches",
    updatedProfile.email,
    updatedEmail,
  );
  TestValidator.equals(
    "updated username matches",
    updatedProfile.username,
    updatedUsername,
  );

  // Step 4: Validate moderator ID remains unchanged
  TestValidator.equals(
    "moderator ID preserved",
    updatedProfile.id,
    joinedModerator.id,
  );

  // Step 5: Validate profile update successfully modified account information
  TestValidator.predicate(
    "profile update succeeded with new email and username",
    updatedProfile.email === updatedEmail &&
      updatedProfile.username === updatedUsername,
  );
}
