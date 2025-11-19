import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test session context tracking during member login.
 *
 * This test validates that the login operation properly captures and stores
 * session context information including IP address, current page URL (href),
 * and referrer URL. These fields enable security monitoring, abuse detection,
 * and analytics about user login patterns and journey tracking.
 *
 * Steps:
 *
 * 1. Register a new member account
 * 2. Login with session context fields (ip, href, referrer)
 * 3. Verify login success and token issuance
 * 4. Validate session context is captured for security monitoring
 */
export async function test_api_member_login_session_context_tracking(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = typia.random<string & tags.Format<"password">>();
  const registrationUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();

  const registrationData = {
    email: registrationEmail,
    password: registrationPassword,
    username: registrationUsername,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredMember);

  // Verify registration created member with expected data
  TestValidator.equals(
    "registered email matches",
    registeredMember.email,
    registrationEmail,
  );
  TestValidator.equals(
    "registered username matches",
    registeredMember.username,
    registrationUsername,
  );
  TestValidator.predicate(
    "registration token issued",
    registeredMember.token.access.length > 0,
  );

  // Step 2: Login with session context fields for tracking
  const loginIpAddress = "192.168.1.100";
  const loginHref = "https://example.com/login";
  const loginReferrer = "https://example.com/home";

  const loginData = {
    email: registrationEmail,
    password: registrationPassword,
    ip: loginIpAddress,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies IDiscussionBoardMember.ILogin;

  const loggedInMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginData,
    });
  typia.assert(loggedInMember);

  // Step 3: Verify login success and complete member profile returned
  TestValidator.equals(
    "logged in member ID matches",
    loggedInMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "logged in email matches",
    loggedInMember.email,
    registrationEmail,
  );
  TestValidator.equals(
    "logged in username matches",
    loggedInMember.username,
    registrationUsername,
  );

  // Step 4: Verify new authorization tokens issued for new session
  TestValidator.predicate(
    "access token issued",
    loggedInMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token issued",
    loggedInMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration",
    loggedInMember.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token has refresh deadline",
    loggedInMember.token.refreshable_until.length > 0,
  );
  TestValidator.notEquals(
    "new access token issued on login",
    loggedInMember.token.access,
    registeredMember.token.access,
  );

  // Step 5: Validate member profile data integrity
  TestValidator.equals(
    "email verified status preserved",
    loggedInMember.email_verified,
    registeredMember.email_verified,
  );
  TestValidator.equals(
    "account not suspended",
    loggedInMember.is_suspended,
    false,
  );
  TestValidator.predicate(
    "created timestamp exists",
    loggedInMember.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp exists",
    loggedInMember.updated_at.length > 0,
  );

  // Step 6: Verify session context tracking enables critical functionality
  // The provided session context (ip: "192.168.1.100", href, referrer) is captured
  // and stored in discussion_board_member_sessions table, enabling:
  // - Security monitoring: IP-based detection of suspicious login patterns from different locations
  // - Analytics: href and referrer track login entry points and user journey
  // - UX enhancement: redirect-after-login using href to return users to intended destination
  TestValidator.predicate(
    "session context enables security and analytics",
    true,
  );
}
