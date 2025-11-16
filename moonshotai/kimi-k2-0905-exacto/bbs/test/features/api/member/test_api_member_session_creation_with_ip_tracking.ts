import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

/**
 * Test creating a session with IP address tracking for security monitoring
 * purposes. This validates that member IP addresses are properly captured and
 * stored with session information for security analysis and suspicious activity
 * detection.
 *
 * The workflow:
 *
 * 1. Create a new member account to have valid member credentials
 * 2. Use the created member to create a session with IP tracking details
 * 3. Verify the session captures IP address and connection context correctly
 * 4. Validate that security tracking data is stored as expected
 */
export async function test_api_member_session_creation_with_ip_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for testing IP tracking
  const createMemberBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
  } satisfies IEconomicDiscussionMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: createMemberBody,
  });
  typia.assert(memberAuth);

  TestValidator.equals(
    "member created successfully",
    memberAuth.member.username,
    createMemberBody.username,
  );
  TestValidator.equals(
    "member email set correctly",
    memberAuth.member.email,
    createMemberBody.email,
  );

  // Step 2: Create session with IP address tracking
  const sessionCreateBody = {
    href: "https://example.discussion-board.com/login",
    ip: "192.168.1.100",
    referrer: "https://example.discussion-board.com/",
  } satisfies IEconomicDiscussionMemberSession.ICreate;

  const createdSession =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: memberAuth.member.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(createdSession);

  // Step 3: Validate session creation and IP tracking
  TestValidator.equals(
    "session member ID matches member",
    createdSession.member.id,
    memberAuth.member.id,
  );
  TestValidator.equals(
    "session member username matches",
    createdSession.member.username,
    memberAuth.member.username,
  );
  TestValidator.equals(
    "session member email matches",
    createdSession.member.email,
    memberAuth.member.email,
  );

  TestValidator.equals(
    "IP address captured correctly",
    createdSession.ip,
    sessionCreateBody.ip,
  );
  TestValidator.equals(
    "connection href stored correctly",
    createdSession.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "referrer captured correctly",
    createdSession.referrer,
    sessionCreateBody.referrer,
  );

  TestValidator.predicate(
    "session has created_at timestamp",
    typeof createdSession.created_at === "string" &&
      createdSession.created_at.length > 0,
  );
  TestValidator.equals("session has ID", typeof createdSession.id, "string");

  // Optional: Verify the IP format if available
  TestValidator.equals(
    "IP should have 4 octets",
    sessionCreateBody.ip.split(".").length,
    4,
  );
  TestValidator.predicate(
    "each IP part should be valid number between 0-255",
    sessionCreateBody.ip.split(".").every((part) => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    }),
  );
}
