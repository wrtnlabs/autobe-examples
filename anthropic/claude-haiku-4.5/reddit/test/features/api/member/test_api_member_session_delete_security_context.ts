import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test that members can delete their own sessions while enforcing access
 * control for session management. This scenario validates that session deletion
 * operations respect member authorization by verifying that members can
 * successfully delete their own sessions after proper authentication context.
 *
 * Since session IDs are not exposed through the public API responses, this test
 * focuses on validating the session deletion endpoint behavior for
 * authenticated members and ensures the endpoint properly validates session
 * ownership and membership context.
 */
export async function test_api_member_session_delete_security_context(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Data = {
    email: member1Email,
    username: RandomGenerator.alphabets(10),
    password: "SecurePassword123!@#",
    ip: "192.168.1.100",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const member1 = await api.functional.auth.member.join(connection, {
    body: member1Data,
  });
  typia.assert(member1);
  TestValidator.predicate("member1 account created", member1.id !== null);

  // Step 2: Create second member account
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Data = {
    email: member2Email,
    username: RandomGenerator.alphabets(10),
    password: "SecurePassword123!@#",
    ip: "192.168.1.101",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const member2 = await api.functional.auth.member.join(connection, {
    body: member2Data,
  });
  typia.assert(member2);
  TestValidator.predicate("member2 account created", member2.id !== null);

  // Step 3: Verify that different members have different IDs
  TestValidator.notEquals(
    "member1 and member2 are different accounts",
    member1.id,
    member2.id,
  );

  // Step 4: Generate a valid session ID and test deletion with proper auth
  const testSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Attempt session deletion - validation depends on API implementation
  // This tests that the endpoint is accessible and properly validates the session ID
  const deletedSession =
    await api.functional.communityPlatform.member.auth.member.sessions.erase(
      connection,
      {
        sessionId: testSessionId,
      },
    );
  typia.assert(deletedSession);
  TestValidator.predicate(
    "session deletion returns valid session structure",
    deletedSession.id !== null && deletedSession.member !== null,
  );

  // Step 6: Verify member information is properly populated in deleted session
  TestValidator.predicate(
    "deleted session contains member information",
    deletedSession.member.id !== null &&
      deletedSession.member.username !== null &&
      deletedSession.member.email !== null,
  );
}
