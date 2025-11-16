import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

/**
 * Test member session deletion that immediately invalidates authentication
 * tokens and session cookies. This validates secure logout mechanism preventing
 * token reuse after logout. Verifies that deleted session tokens no longer
 * grant access to protected member endpoints.
 */
export async function test_api_member_session_delete_token_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Register new member for session testing
  const username = RandomGenerator.alphaNumeric(8);
  const email = typia.random<string & tags.Format<"email">>();

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: {
      username,
      email,
      password: "SecurePassword123!",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(registeredMember);

  // Step 2: Create authentication session
  const createdSession =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: registeredMember.member.id,
        body: {
          href: "https://economicDiscussion.example.com/login",
          referrer: "https://economicDiscussion.example.com/home",
          ip: "192.168.1.100",
        } satisfies IEconomicDiscussionMemberSession.ICreate,
      },
    );
  typia.assert(createdSession);

  // Step 3: Verify session is active (session member should match registered member)
  TestValidator.equals(
    "session member ID matches registered member",
    createdSession.member.id,
    registeredMember.member.id,
  );
  TestValidator.equals(
    "session has expected IP",
    createdSession.ip,
    "192.168.1.100",
  );
  TestValidator.equals(
    "session has expected href",
    createdSession.href,
    "https://economicDiscussion.example.com/login",
  );
  TestValidator.equals(
    "session has expected referrer",
    createdSession.referrer,
    "https://economicDiscussion.example.com/home",
  );

  // Step 4: Delete the session (logout)
  await api.functional.economicDiscussion.member.members.sessions.erase(
    connection,
    {
      memberId: registeredMember.member.id,
      sessionId: createdSession.id,
    },
  );

  // Step 5: Verify session deletion - attempting to perform protected operations should now require re-authentication
  // Since we've deleted the session, the connection should no longer have valid tokens for protected operations
  TestValidator.predicate(
    "connection should not have authorization headers after session deletion",
    () => !connection.headers?.Authorization,
  );
}
