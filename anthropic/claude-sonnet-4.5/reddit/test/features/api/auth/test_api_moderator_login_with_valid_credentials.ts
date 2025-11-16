import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test the complete moderator login flow with valid credentials.
 *
 * This test validates the core authentication workflow for moderators:
 *
 * 1. Create a moderator account with valid registration data
 * 2. Authenticate using the login endpoint with the registered credentials
 * 3. Verify the login response contains complete profile and valid JWT tokens
 * 4. Validate token structure and expiration timestamps
 * 5. Ensure profile data consistency between registration and login
 */
export async function test_api_moderator_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // Generate test credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "SecurePassword123!";
  const testNickname = RandomGenerator.name();

  // Session tracking data
  const sessionHref = typia.random<string & tags.Format<"uri">>();
  const sessionReferrer = typia.random<string & tags.Format<"uri">>();

  // Step 1: Create moderator account
  const registrationData = {
    email: testEmail,
    password: testPassword,
    nickname: testNickname,
    href: sessionHref,
    referrer: sessionReferrer,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const createdModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  // Validate registration response
  typia.assert(createdModerator);
  TestValidator.equals(
    "registration email matches",
    createdModerator.email,
    testEmail,
  );
  TestValidator.equals(
    "registration nickname matches",
    createdModerator.nickname,
    testNickname,
  );

  // Step 2: Authenticate with login endpoint
  const loginData = {
    email: testEmail,
    password: testPassword,
    href: sessionHref,
    referrer: sessionReferrer,
  } satisfies IRedditCommunityCommunityModerator.ILogin;

  const authenticatedModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginData,
    });

  // Step 3: Validate login response structure
  typia.assert(authenticatedModerator);

  // Step 4: Validate profile data consistency
  TestValidator.equals(
    "login email matches registration",
    authenticatedModerator.email,
    testEmail,
  );
  TestValidator.equals(
    "login nickname matches registration",
    authenticatedModerator.nickname,
    testNickname,
  );
  TestValidator.equals(
    "moderator ID consistency",
    authenticatedModerator.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "username consistency",
    authenticatedModerator.username,
    createdModerator.username,
  );

  // Step 5: Validate JWT token structure
  const token: IAuthorizationToken = authenticatedModerator.token;
  typia.assert(token);

  // Validate tokens are non-empty strings
  TestValidator.predicate("access token is non-empty", token.access.length > 0);
  TestValidator.predicate(
    "refresh token is non-empty",
    token.refresh.length > 0,
  );

  // Step 6: Validate token expiration timestamps
  const now = new Date();
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);

  // Tokens should expire in the future
  TestValidator.predicate("access token expires in future", expiredAt > now);
  TestValidator.predicate(
    "refresh token expires in future",
    refreshableUntil > now,
  );

  // Refresh token should have longer lifetime than access token
  TestValidator.predicate(
    "refresh token lifetime exceeds access token",
    refreshableUntil > expiredAt,
  );
}
