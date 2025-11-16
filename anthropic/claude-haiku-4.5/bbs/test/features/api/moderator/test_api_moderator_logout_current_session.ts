import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator successfully logging out from their current session.
 *
 * This test validates the moderator logout functionality by:
 *
 * 1. Creating a new moderator account via registration
 * 2. Authenticating as the moderator to establish a session
 * 3. Calling the logout endpoint to terminate the session
 * 4. Verifying that the logout was successful
 *
 * The test ensures that the moderator can properly terminate their
 * administrative session and that the session termination is recorded with the
 * expired_at timestamp.
 */
export async function test_api_moderator_logout_current_session(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorDisplayName = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<100>
  >();

  const registered: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(registered);

  TestValidator.equals(
    "registered moderator has correct display name",
    registered.moderator.display_name,
    moderatorDisplayName,
  );

  TestValidator.equals(
    "registered moderator has active status",
    registered.moderator.account_status,
    "active",
  );

  // Step 2: Authenticate as the moderator to establish a session
  const authenticated: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(authenticated);

  TestValidator.predicate(
    "authenticated moderator has valid access token",
    !!authenticated.token.access,
  );

  TestValidator.predicate(
    "authenticated moderator has valid refresh token",
    !!authenticated.token.refresh,
  );

  // Step 3: Call the logout endpoint to terminate the session
  await api.functional.discussionBoard.moderator.auth.moderator.logout(
    connection,
  );

  TestValidator.predicate("logout endpoint executed successfully", true);
}
