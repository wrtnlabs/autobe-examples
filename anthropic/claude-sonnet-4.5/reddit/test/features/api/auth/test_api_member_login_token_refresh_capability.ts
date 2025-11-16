import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that login-issued tokens include proper refresh token for session
 * extension.
 *
 * This test validates the token refresh capability by:
 *
 * 1. Registering a new member account
 * 2. Logging in with the created credentials
 * 3. Examining the returned token structure
 * 4. Verifying refresh token expiration extends beyond access token expiration
 * 5. Confirming tokens enable continuous session management
 */
export async function test_api_member_login_token_refresh_capability(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account for testing
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "SecurePass123!";
  const testUsername = RandomGenerator.alphaNumeric(10);

  const registrationBody = {
    username: testUsername,
    email: testEmail,
    password: testPassword,
    href: "https://test.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://test.example.com" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityGuest.ICreate;

  const registeredMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredMember);

  // Step 2: Login with the created member credentials
  const loginBody = {
    email: testEmail,
    password: testPassword,
    href: "https://test.example.com/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://test.example.com" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityGuest.ILogin;

  const loggedInMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInMember);

  // Step 3: Extract and validate the token structure
  const token: IAuthorizationToken = loggedInMember.token;
  typia.assert(token);

  // Step 4: Validate business logic - timestamps must be in the future
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt > now,
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntil > now,
  );

  // Step 5: Critical validation - refresh token must extend beyond access token for session extension
  TestValidator.predicate(
    "refresh token expiration extends beyond access token expiration",
    refreshableUntil > expiredAt,
  );
}
