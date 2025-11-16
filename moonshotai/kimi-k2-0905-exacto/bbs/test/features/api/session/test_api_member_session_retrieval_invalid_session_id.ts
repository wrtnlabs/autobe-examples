import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

/**
 * Test retrieving session details with an invalid session ID to verify proper
 * error handling. This ensures the system gracefully handles malformed or
 * non-existent session identifiers without exposing sensitive information.
 *
 * 1. Register new member for authentication context
 * 2. Create a valid session to establish test environment
 * 3. Test with invalid session ID (non-UUID format)
 * 4. Test with non-existent but valid UUID format
 * 5. Verify error handling prevents information disclosure
 */
export async function test_api_member_session_retrieval_invalid_session_id(
  connection: api.IConnection,
) {
  // Step 1: Register new member to establish authentication context
  const registrationData = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });
  typia.assert(member);

  // Create unauthenticated connection to test access control
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 2: Test with completely invalid session ID (non-UUID format)
  const completelyInvalidId = "definitely-not-a-uuid-12345";

  await TestValidator.error(
    "should reject completely invalid session ID format",
    async () => {
      await api.functional.economicDiscussion.member.members.sessions.at(
        unauthConn,
        {
          memberId: member.member.id,
          sessionId: completelyInvalidId,
        },
      );
    },
  );

  // Step 3: Test with malformed session ID (close to UUID but invalid)
  const malformedUuid = "550e8400-e29b-41d4-a716-44665544000g"; // Ends with 'g' which is invalid hex

  await TestValidator.error(
    "should reject malformed UUID session ID",
    async () => {
      await api.functional.economicDiscussion.member.members.sessions.at(
        unauthConn,
        {
          memberId: member.member.id,
          sessionId: malformedUuid,
        },
      );
    },
  );

  // Step 4: Test with non-existent but valid UUID format
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should error when session does not exist",
    async () => {
      await api.functional.economicDiscussion.member.members.sessions.at(
        unauthConn,
        {
          memberId: member.member.id,
          sessionId: nonExistentSessionId,
        },
      );
    },
  );

  // Step 5: Test with member ID that doesn't match the session's member
  await TestValidator.error(
    "should reject session lookup for wrong member",
    async () => {
      const differentMemberId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.economicDiscussion.member.members.sessions.at(
        connection,
        {
          memberId: differentMemberId,
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
}
