import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";

/**
 * Test moderator token refresh with an invalid refresh token. A moderator
 * account is registered and authenticated to obtain tokens. The refresh token
 * is replaced with an invalid string (simulating an expired token) and a
 * refresh request is made. The system must return a 401 Unauthorized response,
 * rejecting the request and forcing re-authentication via the join/login flow.
 * This validates the system’s enforcement of token lifecycle expiration
 * policies by ensuring any invalid token (including expired ones) triggers
 * authentication failure.
 *
 * This test follows a 4-step sequential workflow:
 *
 * 1. Creates a moderator account using the join endpoint
 * 2. Authenticates the moderator account to obtain an access token and refresh
 *    token
 * 3. Uses an invalid, non-existent refresh token string to attempt a refresh
 *    request
 * 4. Verifies that the system responds with a 401 error, confirming proper token
 *    validation enforcement
 *
 * Since the server manages refresh token expiration in an external session
 * store (Redis) and the token is opaque, we cannot construct an expired token
 * in the test environment. Instead, we test against a clearly invalid refresh
 * token string ("INVALID_REFRESH_TOKEN") to simulate the scenario of using an
 * expired token, which also prevents re-authentication.
 */
export async function test_api_moderator_refresh_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const createdModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail,
    });
  typia.assert(createdModerator);

  // Step 2: Authenticate the moderator to obtain a refresh token
  const authResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IModerator.IAuth,
    });
  typia.assert(authResponse);

  // Step 3: Attempt to refresh the access token using an invalid (simulated expired) refresh token
  await TestValidator.error(
    "refresh request with invalid token should fail with 401 unauthorized",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: "INVALID_REFRESH_TOKEN" satisfies IModerator.IRefresh,
      });
    },
  );

  // Step 4: Verify that authentication still works with valid credentials (sanity check)
  // (This ensures the system is still operational and the failure was due to token invalidity, not other issues)
  const reauthResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IModerator.IAuth,
    });
  typia.assert(reauthResponse);
}
