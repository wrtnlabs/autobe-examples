import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test successful member login with valid credentials.
 *
 * This test validates the complete authentication workflow for existing
 * Reddit-like platform members. The test follows a two-step process:
 *
 * 1. Register a new member account with valid credentials (username, email,
 *    password)
 * 2. Authenticate using the registered credentials to verify login functionality
 *
 * During login, the system validates credentials against the
 * reddit_like_members table, generates new JWT tokens (access token expiring in
 * 30 minutes, refresh token expiring in 30 days), creates a session record in
 * reddit_like_sessions with IP address and user agent tracking, and resets the
 * failed login attempt counter to zero.
 *
 * The response verification ensures:
 *
 * - Complete user profile information is returned (id, username, email,
 *   profile_bio, avatar_url)
 * - Email verification status is included
 * - Karma scores are present (post_karma and comment_karma)
 * - Both JWT tokens are issued (access and refresh tokens with proper expiration
 *   timestamps)
 */
export async function test_api_member_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = typia.random<string & tags.MinLength<8>>();
  const registrationUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const registrationBody = {
    username: registrationUsername,
    email: registrationEmail,
    password: registrationPassword,
  } satisfies IRedditLikeMember.ICreate;

  const registeredMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredMember);

  // Verify registration was successful
  TestValidator.equals(
    "registered username matches",
    registeredMember.username,
    registrationUsername,
  );
  TestValidator.equals(
    "registered email matches",
    registeredMember.email,
    registrationEmail,
  );
  TestValidator.predicate(
    "member ID is generated",
    registeredMember.id !== undefined && registeredMember.id !== null,
  );

  // Step 2: Login with the registered credentials
  const loginBody = {
    email: registrationEmail,
    password: registrationPassword,
  } satisfies IRedditLikeMember.ILogin;

  const loggedInMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInMember);

  // Verify login response contains complete user profile
  TestValidator.equals(
    "logged in member ID matches registered ID",
    loggedInMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "logged in username matches",
    loggedInMember.username,
    registrationUsername,
  );
  TestValidator.equals(
    "logged in email matches",
    loggedInMember.email,
    registrationEmail,
  );

  // Verify email verification status is present
  TestValidator.predicate(
    "email verified status is boolean",
    typeof loggedInMember.email_verified === "boolean",
  );

  // Verify karma scores are present and initialized
  TestValidator.predicate(
    "post karma is number",
    typeof loggedInMember.post_karma === "number",
  );
  TestValidator.predicate(
    "comment karma is number",
    typeof loggedInMember.comment_karma === "number",
  );

  // Verify JWT tokens are issued
  TestValidator.predicate(
    "access token is present",
    loggedInMember.token.access !== undefined &&
      loggedInMember.token.access !== null,
  );
  TestValidator.predicate(
    "refresh token is present",
    loggedInMember.token.refresh !== undefined &&
      loggedInMember.token.refresh !== null,
  );
  TestValidator.predicate(
    "token expiration timestamp is present",
    loggedInMember.token.expired_at !== undefined &&
      loggedInMember.token.expired_at !== null,
  );
  TestValidator.predicate(
    "refresh token expiration is present",
    loggedInMember.token.refreshable_until !== undefined &&
      loggedInMember.token.refreshable_until !== null,
  );

  // Verify tokens are different from registration tokens (new session created)
  TestValidator.notEquals(
    "new access token issued on login",
    loggedInMember.token.access,
    registeredMember.token.access,
  );
  TestValidator.notEquals(
    "new refresh token issued on login",
    loggedInMember.token.refresh,
    registeredMember.token.refresh,
  );
}
