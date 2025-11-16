import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that member login properly captures and stores session information for
 * security monitoring.
 *
 * This test validates that the login endpoint creates session records with
 * proper context tracking including href, referrer, and IP address. The test
 * workflow ensures:
 *
 * 1. Register a member account with session tracking information
 * 2. Login with the registered credentials providing different session context
 * 3. Verify successful authentication with valid JWT tokens
 * 4. Test multiple concurrent sessions for the same member
 * 5. Confirm session context parameters are accepted and processed
 *
 * The test verifies that session tracking data (href, referrer, IP) is properly
 * captured during both registration and login operations, enabling security
 * monitoring and audit trails.
 */
export async function test_api_member_login_session_tracking(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account with session tracking
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "securePassword123";
  const memberUsername = RandomGenerator.name();

  // Generate realistic session context for registration
  const registrationHref = "https://example.com/register";
  const registrationReferrer = "https://example.com/home";
  const registrationIp = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}`;

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      ip: registrationIp,
      href: registrationHref,
      referrer: registrationReferrer,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(registeredMember);

  // Validate registration response
  TestValidator.equals(
    "registered email matches",
    registeredMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "registered username matches",
    registeredMember.username,
    memberUsername,
  );
  TestValidator.predicate(
    "access token exists",
    registeredMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    registeredMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration",
    registeredMember.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token has refresh expiration",
    registeredMember.token.refreshable_until.length > 0,
  );

  // Step 2: Login with the registered member providing different session context with IP
  const loginHref = "https://example.com/login";
  const loginReferrer = "https://example.com/dashboard";
  const loginIp = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}`;

  const firstLoginSession = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: loginIp,
      href: loginHref,
      referrer: loginReferrer,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(firstLoginSession);

  // Validate first login session
  TestValidator.equals(
    "login member id matches registration",
    firstLoginSession.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "login email matches",
    firstLoginSession.email,
    memberEmail,
  );
  TestValidator.equals(
    "login username matches",
    firstLoginSession.username,
    memberUsername,
  );
  TestValidator.predicate(
    "first login access token exists",
    firstLoginSession.token.access.length > 0,
  );
  TestValidator.predicate(
    "first login refresh token exists",
    firstLoginSession.token.refresh.length > 0,
  );

  // Step 3: Create a second login session without IP to verify optional IP parameter handling
  const secondLoginHref = "https://example.com/login";
  const secondLoginReferrer = "https://example.com/profile";

  const secondLoginSession = await api.functional.auth.member.login(
    connection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
        href: secondLoginHref,
        referrer: secondLoginReferrer,
      } satisfies IDiscussionBoardMember.ILogin,
    },
  );
  typia.assert(secondLoginSession);

  // Validate second login session
  TestValidator.equals(
    "second login member id matches",
    secondLoginSession.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "second login email matches",
    secondLoginSession.email,
    memberEmail,
  );
  TestValidator.predicate(
    "second login access token exists",
    secondLoginSession.token.access.length > 0,
  );
  TestValidator.predicate(
    "second login refresh token exists",
    secondLoginSession.token.refresh.length > 0,
  );

  // Step 4: Verify that different sessions have different tokens (multiple concurrent sessions)
  TestValidator.notEquals(
    "different sessions have different access tokens",
    firstLoginSession.token.access,
    secondLoginSession.token.access,
  );
  TestValidator.notEquals(
    "different sessions have different refresh tokens",
    firstLoginSession.token.refresh,
    secondLoginSession.token.refresh,
  );
}
