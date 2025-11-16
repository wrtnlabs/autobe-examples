import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

/**
 * Test creating member authentication session after successful login. This
 * validates the complete login flow where member provides credentials and
 * receives JWT tokens along with session tracking.
 *
 * Test workflow:
 *
 * 1. Register a new member account to establish authentication
 * 2. Create a session for the member with proper metadata
 * 3. Validate session contains member summary and tracking data
 * 4. Verify session metadata includes correct URLs and IP address
 * 5. Ensure session response structure is complete and valid
 */
export async function test_api_member_session_create_login_success(
  connection: api.IConnection,
) {
  // Register a new member account first
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(registeredMember);

  // Create session for the registered member
  const sessionData = {
    href: "https://example.com/login",
    referrer: "https://example.com/register",
    ip: "192.168.1.1",
  } satisfies IEconomicDiscussionMemberSession.ICreate;

  const session =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: registeredMember.member.id,
        body: sessionData,
      },
    );

  // Validate session response
  typia.assert(session);

  // Verify session contains correct member information
  TestValidator.equals(
    "session member ID matches registered member",
    session.member.id,
    registeredMember.member.id,
  );
  TestValidator.equals(
    "session member username matches",
    session.member.username,
    registeredMember.member.username,
  );
  TestValidator.equals(
    "session member email matches",
    session.member.email,
    registeredMember.member.email,
  );

  // Verify session metadata
  TestValidator.equals(
    "session href matches request",
    session.href,
    sessionData.href,
  );
  TestValidator.equals(
    "session referrer matches request",
    session.referrer,
    sessionData.referrer,
  );
  TestValidator.equals(
    "session IP matches request",
    session.ip,
    sessionData.ip,
  );

  // Verify session has required fields
  TestValidator.predicate(
    "session has valid ID",
    typeof session.id === "string" && session.id.length > 0,
  );
  TestValidator.predicate(
    "session has created_at timestamp",
    typeof session.created_at === "string" && session.created_at.length > 0,
  );
}
