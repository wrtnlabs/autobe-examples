import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test logout-all functionality to terminate member sessions.
 *
 * Validates that the logout-all endpoint successfully terminates the member's
 * authenticated session. This test verifies the logout operation completes
 * successfully and returns appropriate response data including member ID,
 * logout timestamp, and confirmation message.
 *
 * Test workflow:
 *
 * 1. Create member account and establish initial session
 * 2. Verify member is authenticated with valid access token
 * 3. Invoke logout-all endpoint to terminate all sessions
 * 4. Verify logout response contains correct member information
 * 5. Verify logout timestamp is valid
 * 6. Verify logout success message is returned
 */
export async function test_api_member_logout_all_multiple_devices(
  connection: api.IConnection,
) {
  // 1. Create member account and establish initial session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";
  const memberUsername = RandomGenerator.alphabets(8);

  const createMemberBody = {
    email: memberEmail,
    username: memberUsername,
    password: memberPassword,
    ip: "192.168.1.100",
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberSession = await api.functional.auth.member.join(connection, {
    body: createMemberBody,
  });
  typia.assert(memberSession);

  // Store member ID and verify session was established
  const memberId = memberSession.id;
  TestValidator.equals("member ID is valid UUID", typeof memberId, "string");

  // 2. Verify member has valid authenticated session
  const sessionToken = memberSession.token;
  TestValidator.predicate(
    "access token exists and is non-empty",
    sessionToken.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists and is non-empty",
    sessionToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is valid",
    !isNaN(new Date(sessionToken.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refresh token expiration is valid",
    !isNaN(new Date(sessionToken.refreshable_until).getTime()),
  );

  // 3. Invoke logout-all endpoint to terminate all sessions
  const logoutResponse =
    await api.functional.communityPlatform.member.auth.member.sessions.logout_all.logoutAll(
      connection,
    );
  typia.assert(logoutResponse);

  // 4. Verify logout response contains correct member ID
  TestValidator.equals(
    "logout response member ID matches authenticated member",
    logoutResponse.id,
    memberId,
  );

  // 5. Verify logout response has valid logout timestamp
  TestValidator.predicate(
    "logout timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(logoutResponse.logout_at),
  );

  const logoutTime = new Date(logoutResponse.logout_at);
  TestValidator.predicate(
    "logout timestamp is parseable as valid date",
    !isNaN(logoutTime.getTime()),
  );

  // 6. Verify logout success message is returned
  TestValidator.predicate(
    "logout message is non-empty string",
    logoutResponse.message.length > 0,
  );
  TestValidator.predicate(
    "logout message indicates successful operation",
    logoutResponse.message.toLowerCase().includes("logout") ||
      logoutResponse.message.toLowerCase().includes("success") ||
      logoutResponse.message.toLowerCase().includes("terminated"),
  );
}
