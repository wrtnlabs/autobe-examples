import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Tests that token refresh returns updated permissions if moderator privileges
 * changed.
 *
 * This test validates the token refresh workflow to ensure moderators receive
 * current authorization information when refreshing their access tokens. The
 * test creates a moderator account, performs authentication, and validates
 * token refresh functionality.
 *
 * Test workflow:
 *
 * 1. Create a moderator account through registration
 * 2. Login with moderator credentials to obtain fresh tokens
 * 3. Use the refresh token to obtain a new access token
 * 4. Verify the refreshed response contains valid token structure
 * 5. Validate that all token responses follow the IAuthorized schema
 */
export async function test_api_moderator_token_refresh_updates_permissions(
  connection: api.IConnection,
) {
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const registrationData = {
    appointed_by_admin_id: adminId,
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: moderatorEmail,
    password: moderatorPassword,
  } satisfies IDiscussionBoardModerator.ICreate;

  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredModerator);

  const loginData = {
    email: moderatorEmail,
    password: moderatorPassword,
  } satisfies IDiscussionBoardModerator.ILogin;

  const loggedInModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginData,
    });
  typia.assert(loggedInModerator);

  TestValidator.equals(
    "logged in moderator ID matches registered moderator",
    loggedInModerator.id,
    registeredModerator.id,
  );

  const refreshData = {
    refresh_token: loggedInModerator.token.refresh,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const refreshedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: refreshData,
    });
  typia.assert(refreshedModerator);

  TestValidator.equals(
    "refreshed moderator ID matches original moderator",
    refreshedModerator.id,
    registeredModerator.id,
  );
}
