import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test successful member login using email address instead of username.
 *
 * This test validates that the Reddit Community platform supports flexible
 * authentication by allowing members to log in using their email address as an
 * alternative to their username. The test ensures that email-based
 * authentication properly validates credentials and returns complete JWT tokens
 * with member profile information.
 *
 * Test Flow:
 *
 * 1. Register a new member account with email, username, and password
 * 2. Use the registered email and password to authenticate via login endpoint
 * 3. Validate that login succeeds and returns JWT tokens
 * 4. Verify that the returned member profile matches the registered account
 * 5. Confirm that authentication tokens include access, refresh, and expiration
 *    data
 */
export async function test_api_member_login_with_email(
  connection: api.IConnection,
) {
  // Step 1: Generate test credentials for member registration
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "testPassword123"; // Meets 8 character minimum requirement
  const testUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();

  // Step 2: Register a new member account
  const registrationData = {
    username: testUsername,
    email: testEmail,
    password: testPassword,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });
  typia.assert(registeredMember);

  // Step 3: Authenticate using email and password
  const loginData = {
    email: testEmail,
    password: testPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ILogin;

  const authenticatedMember = await api.functional.auth.member.login(
    connection,
    {
      body: loginData,
    },
  );
  typia.assert(authenticatedMember);

  // Step 4: Validate authentication response structure and data
  TestValidator.equals(
    "authenticated member ID matches registered member",
    authenticatedMember.id,
    registeredMember.id,
  );

  TestValidator.equals(
    "authenticated email matches registered email",
    authenticatedMember.email,
    testEmail,
  );

  TestValidator.equals(
    "authenticated username matches registered username",
    authenticatedMember.username,
    testUsername,
  );

  // Step 5: Verify JWT tokens are present
  TestValidator.predicate(
    "access token is non-empty string",
    authenticatedMember.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is non-empty string",
    authenticatedMember.token.refresh.length > 0,
  );

  // Step 6: Validate token expiration timestamps
  const expiredAt = new Date(authenticatedMember.token.expired_at);
  const refreshableUntil = new Date(
    authenticatedMember.token.refreshable_until,
  );

  TestValidator.predicate(
    "expired_at is a valid future date",
    expiredAt.getTime() > Date.now(),
  );

  TestValidator.predicate(
    "refreshable_until is a valid future date",
    refreshableUntil.getTime() > Date.now(),
  );

  // Step 7: Verify member profile data integrity
  TestValidator.equals(
    "karma scores are initialized",
    authenticatedMember.post_karma,
    0,
  );

  TestValidator.equals(
    "comment karma is initialized",
    authenticatedMember.comment_karma,
    0,
  );
}
