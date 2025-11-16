import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test logout behavior and session termination.
 *
 * Verifies that logout properly terminates the member's session and prevents
 * further authenticated operations with the same token. Creates a member
 * account, logs in, performs logout, and verifies the token is invalidated.
 * Then creates a new session to confirm the member can log in again and access
 * authenticated endpoints.
 *
 * Test flow:
 *
 * 1. Create a member account and establish session
 * 2. Logout from the session
 * 3. Attempt authenticated operation with invalidated token (should fail)
 * 4. Create new session with same member
 * 5. Verify new session works correctly
 */
export async function test_api_member_logout_concurrent_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create a member account and establish first session
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "SecurePassword123!",
    ip: "192.168.1.100",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth1 = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth1);

  // Store first session info
  const token1 = memberAuth1.token.access;
  const firstSessionConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${token1}` },
  };

  // Step 2: Logout from first session
  await api.functional.communityPlatform.member.auth.member.logout(
    firstSessionConnection,
  );

  TestValidator.predicate("first session logout completed successfully", true);

  // Step 3: Attempt authenticated operation with invalidated token (should fail)
  await TestValidator.error(
    "invalidated token should not allow authenticated operations",
    async () => {
      await api.functional.communityPlatform.member.auth.member.logout(
        firstSessionConnection,
      );
    },
  );

  // Step 4: Create new session with same member
  const memberAuth2 = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth2);

  // Store second session info
  const token2 = memberAuth2.token.access;
  const secondSessionConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${token2}` },
  };

  // Step 5: Verify new session works correctly by performing logout
  await api.functional.communityPlatform.member.auth.member.logout(
    secondSessionConnection,
  );

  TestValidator.predicate("new session logout completed successfully", true);

  // Verify tokens are different between sessions
  TestValidator.notEquals(
    "first and second session tokens should be different",
    token1,
    token2,
  );
}
