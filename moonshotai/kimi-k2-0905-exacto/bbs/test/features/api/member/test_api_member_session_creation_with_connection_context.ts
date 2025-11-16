import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

/**
 * Test creating a session with complete connection context including current
 * page URL and optional referral information. This validates that session
 * creation properly captures the member's authentication context for enhanced
 * security and user experience tracking.
 */
export async function test_api_member_session_creation_with_connection_context(
  connection: api.IConnection,
) {
  // Create a new member account as a prerequisite
  const memberData: IEconomicDiscussionMember.ICreate = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const registeredMember: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(registeredMember);

  // Create session with complete connection context
  const sessionCreationData: IEconomicDiscussionMemberSession.ICreate = {
    href: `https://economic-discussion.example.com/login?redirect=%2Fdashboard`,
    referrer: `https://economic-discussion.example.com/register`,
    ip: "192.168.1.100",
  } satisfies IEconomicDiscussionMemberSession.ICreate;

  const createdSession: IEconomicDiscussionMemberSession =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: registeredMember.member.id,
        body: sessionCreationData,
      },
    );
  typia.assert(createdSession);

  // Validate session properties - CORRECTED parameter order
  TestValidator.equals(
    "member ID matches",
    registeredMember.member.id,
    createdSession.member.id,
  );
  TestValidator.equals(
    "member email matches",
    registeredMember.member.email,
    createdSession.member.email,
  );
  TestValidator.predicate(
    "session has valid created timestamp",
    typeof createdSession.created_at === "string" &&
      createdSession.created_at.length > 0,
  );
  TestValidator.equals(
    "session href matches request",
    sessionCreationData.href,
    createdSession.href,
  );
  TestValidator.equals(
    "session referrer matches request",
    sessionCreationData.referrer,
    createdSession.referrer,
  );
  TestValidator.equals(
    "session IP matches request",
    sessionCreationData.ip,
    createdSession.ip,
  );
  TestValidator.predicate(
    "session has valid ID",
    createdSession.id !== undefined && createdSession.id.length > 0,
  );
}
