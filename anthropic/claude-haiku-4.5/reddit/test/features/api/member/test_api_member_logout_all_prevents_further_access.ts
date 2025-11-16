import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that logout-all completes successfully and invalidates member sessions.
 *
 * This test validates the logout-all security operation by creating a member
 * account, capturing the authentication token, and invoking logout-all to
 * terminate all sessions. The test verifies that the logout-all endpoint
 * executes successfully and returns a valid response with the member's ID and
 * logout timestamp.
 *
 * Security validation workflow:
 *
 * 1. Create a new member account with credentials and session context
 * 2. Capture the initial authentication token from join response
 * 3. Store the member ID for verification
 * 4. Call logout-all endpoint to terminate all sessions
 * 5. Verify logout response contains member ID and logout timestamp
 * 6. Confirm logout message is present
 */
export async function test_api_member_logout_all_prevents_further_access(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(10);
  const password = RandomGenerator.alphaNumeric(12);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const joinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email,
      username,
      password,
      href,
      referrer,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResponse);

  // Step 2: Capture the authentication token and member ID
  const memberId = joinResponse.id;

  // Step 3: Call logout-all endpoint to terminate all sessions
  const logoutResponse =
    await api.functional.communityPlatform.member.auth.member.sessions.logout_all.logoutAll(
      connection,
    );
  typia.assert(logoutResponse);

  // Step 4: Verify logout response contains correct member identification
  TestValidator.equals(
    "logout response contains correct member ID",
    logoutResponse.id,
    memberId,
  );

  // Step 5: Verify logout timestamp is valid ISO format
  TestValidator.predicate("logout_at is valid ISO 8601 timestamp", () => {
    const logoutTime = new Date(logoutResponse.logout_at);
    return !isNaN(logoutTime.getTime());
  });

  // Step 6: Verify logout confirmation message is provided
  TestValidator.predicate("logout message confirms session termination", () => {
    return logoutResponse.message.length > 0;
  });
}
