import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

export async function test_api_member_session_create_with_referral(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to establish authentication
  const memberRegistration = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    email_verified: true,
  } satisfies IEconomicDiscussionMember.ICreate;

  const joinedMember: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(joinedMember);

  // Step 2: Create member session with referral tracking information
  const sessionCreateData = {
    href: `https://economicdiscussions.example.com/articles/economics-101`,
    referrer: `https://economics-blog.example.com/2024/comprehensive-guide-economic-policies`,
    ip: "192.168.1.100",
  } satisfies IEconomicDiscussionMemberSession.ICreate;

  const createdSession: IEconomicDiscussionMemberSession =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: joinedMember.member.id,
        body: sessionCreateData,
      },
    );
  typia.assert(createdSession);

  // Step 3: Validate that the session contains correct member information
  TestValidator.equals(
    "session member ID matches joined member",
    createdSession.member.id,
    joinedMember.member.id,
  );
  TestValidator.equals(
    "session member username matches registration",
    createdSession.member.username,
    memberRegistration.username,
  );
  TestValidator.equals(
    "session member email matches registration",
    createdSession.member.email,
    memberRegistration.email,
  );

  // Step 4: Validate that referral information is properly captured
  TestValidator.equals(
    "session captures correct IP address",
    createdSession.ip,
    sessionCreateData.ip,
  );
  TestValidator.equals(
    "session captures correct connection URL",
    createdSession.href,
    sessionCreateData.href,
  );
  TestValidator.equals(
    "session captures correct referrer URL",
    createdSession.referrer,
    sessionCreateData.referrer,
  );

  // Step 5: Validate session metadata
  TestValidator.predicate(
    "session has valid creation timestamp",
    typia.is<string & tags.Format<"date-time">>(createdSession.created_at),
  );

  // Optional: Test that the session includes session ID and member summary
  TestValidator.predicate(
    "session has valid UUID",
    typia.is<string & tags.Format<"uuid">>(createdSession.id),
  );
  TestValidator.predicate(
    "session member has valid UUID",
    typia.is<string & tags.Format<"uuid">>(createdSession.member.id),
  );
}
