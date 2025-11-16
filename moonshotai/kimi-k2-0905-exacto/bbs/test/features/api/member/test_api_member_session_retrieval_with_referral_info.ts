import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

export async function test_api_member_session_retrieval_with_referral_info(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberInput = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(member);

  // Step 2: Create a session with referral tracking
  const referrerUrl = "https://example.com/referral/campaign123";
  const currentUrl = "https://economic-discussion.com/login";
  const clientIp = "192.168.1.100";

  const session =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: member.member.id,
        body: {
          href: currentUrl,
          referrer: referrerUrl,
          ip: clientIp,
        } satisfies IEconomicDiscussionMemberSession.ICreate,
      },
    );
  typia.assert(session);

  // Step 3: Retrieve the session details
  const retrievedSession =
    await api.functional.economicDiscussion.member.members.sessions.at(
      connection,
      {
        memberId: member.member.id,
        sessionId: session.id,
      },
    );
  typia.assert(retrievedSession);

  // Step 4: Verify session details including referral information
  TestValidator.equals("session ID matches", retrievedSession.id, session.id);
  TestValidator.equals(
    "member details match",
    retrievedSession.member.id,
    member.member.id,
  );
  TestValidator.equals("IP address matches", retrievedSession.ip, clientIp);
  TestValidator.equals("href matches", retrievedSession.href, currentUrl);
  TestValidator.equals(
    "referrer matches",
    retrievedSession.referrer,
    referrerUrl,
  );
  TestValidator.equals(
    "member username matches",
    retrievedSession.member.username,
    memberInput.username,
  );
  TestValidator.equals(
    "member email matches",
    retrievedSession.member.email,
    memberInput.email,
  );

  // Verify timestamps are present
  TestValidator.predicate(
    "created_at is present",
    !!retrievedSession.created_at,
  );
}
