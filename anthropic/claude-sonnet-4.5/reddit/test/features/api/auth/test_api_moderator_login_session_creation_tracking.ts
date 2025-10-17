import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test that successful moderator login creates proper session tracking records.
 *
 * This test validates the complete moderator login workflow and session
 * creation:
 *
 * 1. Register a new moderator account
 * 2. Perform successful login
 * 3. Verify JWT tokens are issued correctly
 * 4. Validate token expiration timestamps
 * 5. Confirm session tracking functionality
 */
export async function test_api_moderator_login_session_creation_tracking(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const registeredModerator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IRedditLikeModerator.ICreate,
    });

  typia.assert(registeredModerator);

  // Step 2: Perform login with the registered credentials
  const loginResponse: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IRedditLikeModerator.ILogin,
    });

  typia.assert(loginResponse);

  // Step 3: Verify the login response contains valid moderator data
  TestValidator.equals(
    "logged in moderator ID matches registered ID",
    loginResponse.id,
    registeredModerator.id,
  );
  TestValidator.equals(
    "logged in moderator email matches",
    loginResponse.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "logged in moderator username matches",
    loginResponse.username,
    moderatorUsername,
  );

  // Step 4: Verify JWT tokens are present
  const token: IAuthorizationToken = loginResponse.token;
  typia.assert(token);

  TestValidator.predicate(
    "access token is a non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    token.refresh.length > 0,
  );

  // Step 5: Validate token expiration timestamps
  const loginTime = new Date();
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);

  // Access token should expire in 30 minutes
  const expectedAccessExpiration = new Date(
    loginTime.getTime() + 30 * 60 * 1000,
  );
  const accessTokenDiff = Math.abs(
    expiredAt.getTime() - expectedAccessExpiration.getTime(),
  );
  TestValidator.predicate(
    "access token expires in approximately 30 minutes",
    accessTokenDiff < 5000,
  );

  // Refresh token should expire in 30 days
  const expectedRefreshExpiration = new Date(
    loginTime.getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  const refreshTokenDiff = Math.abs(
    refreshableUntil.getTime() - expectedRefreshExpiration.getTime(),
  );
  TestValidator.predicate(
    "refresh token expires in approximately 30 days",
    refreshTokenDiff < 60000,
  );

  // Step 6: Verify access token expiration is before refresh token expiration
  TestValidator.predicate(
    "access token expires before refresh token",
    expiredAt.getTime() < refreshableUntil.getTime(),
  );
}
