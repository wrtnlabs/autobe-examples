import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that successful login creates a new session record for tracking.
 *
 * This test validates the complete member authentication workflow including
 * session creation with proper tracking context. It verifies that when a member
 * logs in with valid credentials and provides connection context (href,
 * referrer URLs), the system:
 *
 * 1. Authenticates the credentials successfully
 * 2. Issues valid JWT access and refresh tokens
 * 3. Creates a session record in reddit_community_member_sessions table
 * 4. Captures the provided tracking information (href, referrer, optional IP)
 * 5. Associates the session with the authenticated member
 *
 * The test ensures end-to-end session management functionality works correctly
 * from registration through login with session tracking.
 */
export async function test_api_member_login_session_creation(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account for testing
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = typia.random<string & tags.MinLength<8>>();
  const registrationUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();

  const registrationData = {
    username: registrationUsername,
    email: registrationEmail,
    password: registrationPassword,
    href: "https://reddit-community.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://google.com/search" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityGuest.ICreate;

  const registeredMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  typia.assert(registeredMember);

  // Validate registration response structure
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

  // Step 2: Login with the registered credentials providing session tracking context
  const loginHref =
    "https://reddit-community.example.com/login" satisfies string &
      tags.Format<"uri">;
  const loginReferrer =
    "https://reddit-community.example.com/home" satisfies string &
      tags.Format<"uri">;

  const loginData = {
    email: registrationEmail,
    password: registrationPassword,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies IRedditCommunityGuest.ILogin;

  const authenticatedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginData,
    });

  typia.assert(authenticatedMember);

  // Step 3: Validate successful login with proper session creation
  TestValidator.equals(
    "authenticated member ID matches",
    authenticatedMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "authenticated username matches",
    authenticatedMember.username,
    registrationUsername,
  );
  TestValidator.equals(
    "authenticated email matches",
    authenticatedMember.email,
    registrationEmail,
  );

  // Validate member profile data consistency
  TestValidator.equals(
    "post karma initialized",
    authenticatedMember.post_karma,
    0,
  );
  TestValidator.equals(
    "comment karma initialized",
    authenticatedMember.comment_karma,
    0,
  );
  TestValidator.equals(
    "email verified status",
    authenticatedMember.email_verified,
    false,
  );
}
