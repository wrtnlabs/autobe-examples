import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

/**
 * Test that a member cannot retrieve session details of another member,
 * validating proper authorization boundaries. This ensures session data privacy
 * and prevents unauthorized access to other users' authentication information.
 *
 * Test steps:
 *
 * 1. Create Member A account
 * 2. Create a session for Member A
 * 3. Create Member B account
 * 4. Attempt to access Member A's session using Member B's authentication
 * 5. Verify the access is denied due to authorization boundaries
 */
export async function test_api_member_session_retrieval_different_user_forbidden(
  connection: api.IConnection,
) {
  // Create first member account (Member A)
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberA);

  // Create a session for Member A
  const sessionA =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: memberA.member.id,
        body: {
          href: "https://example.com/dashboard",
          referrer: "https://example.com/login",
          ip: "127.0.0.1",
        } satisfies IEconomicDiscussionMemberSession.ICreate,
      },
    );
  typia.assert(sessionA);

  // Create second member account (Member B) to test cross-user access
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberB);

  // Attempt to access Member A's session using Member B's authentication (should fail)
  await TestValidator.error(
    "accessing another member's session should be forbidden",
    async () => {
      await api.functional.economicDiscussion.member.members.sessions.at(
        connection,
        {
          memberId: memberA.member.id,
          sessionId: sessionA.id,
        },
      );
    },
  );

  // Verify Member B can access their own session access
  const memberBSession =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: memberB.member.id,
        body: {
          href: "https://example.com/dashboard",
          referrer: "https://example.com/login",
          ip: "127.0.0.1",
        } satisfies IEconomicDiscussionMemberSession.ICreate,
      },
    );
  typia.assert(memberBSession);

  // Member B should be able to access their own session
  const ownSessionCheck =
    await api.functional.economicDiscussion.member.members.sessions.at(
      connection,
      {
        memberId: memberB.member.id,
        sessionId: memberBSession.id,
      },
    );
  typia.assert(ownSessionCheck);

  TestValidator.equals(
    "member B owns their own session",
    ownSessionCheck.id,
    memberBSession.id,
  );
}
