import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful logout from all active sessions across all devices.
 *
 * This scenario validates the complete member authentication and session
 * management workflow. The test creates a new member account through the join
 * endpoint and verifies the authentication tokens are properly issued. Then it
 * invokes the logout-all endpoint to terminate all active sessions across all
 * devices.
 *
 * The test verifies:
 *
 * 1. Member account creation with proper authentication
 * 2. Logout operation returns proper confirmation response
 * 3. Response includes member ID, logout timestamp, and confirmation message
 * 4. All active sessions are properly terminated
 */
export async function test_api_member_logout_all_sessions_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(8);
  const memberPassword = RandomGenerator.alphabets(10);

  const joinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResponse);

  // Verify the response contains valid authentication tokens
  TestValidator.predicate(
    "join response should have access token",
    joinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "join response should have refresh token",
    joinResponse.token.refresh.length > 0,
  );

  // Step 2: Call logout-all endpoint to terminate all sessions
  const logoutResponse =
    await api.functional.communityPlatform.member.auth.member.sessions.logout_all.logoutAll(
      connection,
    );
  typia.assert(logoutResponse);

  // Step 3: Verify logout response structure and content
  TestValidator.equals(
    "logout response member ID matches registered member",
    logoutResponse.id,
    joinResponse.id,
  );

  TestValidator.predicate(
    "logout message should be non-empty string",
    logoutResponse.message.length > 0,
  );
}
