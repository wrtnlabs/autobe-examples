import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_moderator_profile_update_partial_update_support(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword =
    RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 8,
      wordMax: 12,
    }).substring(0, 8) + "Aa1!";
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  const registeredModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(registeredModerator);

  TestValidator.equals(
    "registered moderator email matches input",
    registeredModerator.email,
    moderatorEmail,
  );

  // Step 2: Update only email field
  const newEmail = typia.random<string & tags.Format<"email">>();
  const emailUpdateResponse =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {
        email: newEmail,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(emailUpdateResponse);

  TestValidator.equals(
    "email was updated",
    emailUpdateResponse.email,
    newEmail,
  );
  TestValidator.equals(
    "username remains unchanged",
    emailUpdateResponse.username,
    moderatorUsername,
  );

  // Step 3: Update only username field
  const newUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const usernameUpdateResponse =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {
        username: newUsername,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(usernameUpdateResponse);

  TestValidator.equals(
    "username was updated",
    usernameUpdateResponse.username,
    newUsername,
  );
  TestValidator.equals(
    "email remains as previously updated",
    usernameUpdateResponse.email,
    newEmail,
  );

  // Step 4: Update both fields simultaneously
  const finalEmail = typia.random<string & tags.Format<"email">>();
  const finalUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const bothUpdateResponse =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {
        email: finalEmail,
        username: finalUsername,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(bothUpdateResponse);

  TestValidator.equals(
    "both email and username updated",
    bothUpdateResponse.email,
    finalEmail,
  );
  TestValidator.equals(
    "both username updated",
    bothUpdateResponse.username,
    finalUsername,
  );

  // Step 5: Verify partial update with empty body (no changes)
  const noChangeResponse =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {} satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(noChangeResponse);

  TestValidator.equals(
    "email unchanged when empty update",
    noChangeResponse.email,
    finalEmail,
  );
  TestValidator.equals(
    "username unchanged when empty update",
    noChangeResponse.username,
    finalUsername,
  );
}
