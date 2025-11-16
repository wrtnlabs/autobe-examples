import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful member login with valid email and password credentials.
 *
 * This test verifies the complete member authentication flow:
 *
 * 1. Create a new member account with known credentials during setup
 * 2. Login with the registered email and password
 * 3. Verify that JWT tokens (access and refresh) are returned
 * 4. Validate token expiration metadata and ordering
 * 5. Verify that token refresh window extends beyond access token expiration
 *
 * The test ensures that the authentication system properly validates
 * credentials, generates valid JWT tokens, and enables multi-device session
 * tracking through new session creation on login.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with known credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "TestPassword123!@#";
  const testUsername = RandomGenerator.alphaNumeric(12);

  const joinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: testEmail,
      username: testUsername,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResponse);

  // Create new connection for login test (unauthenticated)
  const loginConnection: api.IConnection = { ...connection, headers: {} };

  // Step 2: Login with the registered credentials
  const loginResponse = await api.functional.auth.member.login(
    loginConnection,
    {
      body: {
        email: testEmail,
        password: testPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ILogin,
    },
  );
  typia.assert(loginResponse);

  // Step 3: Validate member ID is present and properly formatted
  TestValidator.predicate(
    "login response should have valid member ID",
    loginResponse.id.length > 0,
  );

  // Step 4: Validate token response structure
  TestValidator.predicate(
    "login response should contain access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response should contain refresh token",
    loginResponse.token.refresh.length > 0,
  );

  // Step 5: Validate token expiration timestamp validity
  TestValidator.predicate(
    "expired_at should be defined",
    loginResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until should be defined",
    loginResponse.token.refreshable_until.length > 0,
  );

  // Step 6: Validate token expiration ordering
  const expiredAtTime = new Date(loginResponse.token.expired_at).getTime();
  const refreshableUntilTime = new Date(
    loginResponse.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshableUntilTime > expiredAtTime,
  );

  // Step 7: Verify tokens are different from registration tokens
  TestValidator.notEquals(
    "login access token should differ from join access token",
    loginResponse.token.access,
    joinResponse.token.access,
  );
  TestValidator.notEquals(
    "login refresh token should differ from join refresh token",
    loginResponse.token.refresh,
    joinResponse.token.refresh,
  );

  // Step 8: Verify login with incorrect password fails
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.member.login(loginConnection, {
        body: {
          email: testEmail,
          password: "WrongPassword123!@#",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformMember.ILogin,
      });
    },
  );

  // Step 9: Verify login with non-existent email fails
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.member.login(loginConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: testPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformMember.ILogin,
      });
    },
  );
}
