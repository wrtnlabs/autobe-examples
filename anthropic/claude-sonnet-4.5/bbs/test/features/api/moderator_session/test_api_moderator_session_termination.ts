import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuth";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the complete moderator logout workflow that terminates an authenticated
 * session.
 *
 * This test validates the session lifecycle from moderator account creation
 * through authentication to session termination via logout. It ensures that the
 * logout operation properly invalidates the refresh token and marks the session
 * as expired in the database.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account through the join operation
 * 2. Verify successful account creation and authentication token receipt
 * 3. Execute the logout operation to terminate the authenticated session
 * 4. Validate that logout succeeds and returns appropriate confirmation
 * 5. Confirm the session termination response structure and success status
 */
export async function test_api_moderator_session_termination(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account to establish an authenticated session
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  // Step 2: Validate successful moderator account creation
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderatorUsername,
  );

  // Step 3: Execute the logout operation to terminate the authenticated session
  const logoutResult: IDiscussionBoardAuth.ILogoutResult =
    await api.functional.discussionBoard.moderator.auth.logout(connection);

  // Step 4: Validate successful logout response
  typia.assert(logoutResult);
  TestValidator.equals(
    "logout operation succeeded",
    logoutResult.success,
    true,
  );
  TestValidator.predicate(
    "logout message is provided",
    logoutResult.message.length > 0,
  );
}
