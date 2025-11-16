import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

/**
 * Test creating member session with network IP tracking for security monitoring
 * during login.
 *
 * This test validates that the economic discussion platform properly captures
 * member network location when establishing authentication sessions. It
 * verifies that IP address tracking works correctly for subsequent security
 * analysis and session verification purposes.
 *
 * Steps:
 *
 * 1. Register a new member account
 * 2. Create a member session with IP tracking data
 * 3. Validate session response contains correct member information
 * 4. Verify IP address is properly captured in session
 * 5. Confirm session metadata includes security tracking fields
 */
export async function test_api_member_session_create_ip_tracking(
  connection: api.IConnection,
) {
  // First, register a new member account to establish authentication context
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const registeredMember: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(registeredMember);

  // Create member session with IP tracking information
  const currentUrl = "https://economic-discussion.example.com/login";
  const testIpAddress = "192.168.1.100";
  const referrerUrl = "https://economic-discussion.example.com/register";

  const sessionData = {
    href: currentUrl,
    ip: testIpAddress,
    referrer: referrerUrl,
  } satisfies IEconomicDiscussionMemberSession.ICreate;

  const createdSession: IEconomicDiscussionMemberSession =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: registeredMember.member.id,
        body: sessionData,
      },
    );
  typia.assert(createdSession);

  // Validate session contains correct member information
  TestValidator.equals(
    "session member ID matches registered member",
    createdSession.member.id,
    registeredMember.member.id,
  );
  TestValidator.equals(
    "session username matches registered member",
    createdSession.member.username,
    registeredMember.member.username,
  );
  TestValidator.equals(
    "session email matches registered member",
    createdSession.member.email,
    registeredMember.member.email,
  );

  // Verify IP tracking is properly captured
  TestValidator.equals(
    "session IP address matches request",
    createdSession.ip,
    testIpAddress,
  );
  TestValidator.equals(
    "session connection URL matches request",
    createdSession.href,
    currentUrl,
  );
  TestValidator.equals(
    "session referrer matches request",
    createdSession.referrer,
    referrerUrl,
  );

  // Validate session metadata
  TestValidator.predicate(
    "session has creation timestamp",
    typeof createdSession.created_at === "string",
  );
  TestValidator.predicate(
    "session creation timestamp is valid date",
    !isNaN(Date.parse(createdSession.created_at)),
  );
}
