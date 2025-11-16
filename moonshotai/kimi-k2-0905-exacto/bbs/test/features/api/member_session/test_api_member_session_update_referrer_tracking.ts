import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

/**
 * Test updating session referrer information for member acquisition analytics
 * after login. This tracks when users continue browsing from login success page
 * to other areas. Validates proper referrer URL updates for understanding user
 * journey patterns across the platform.
 */
export async function test_api_member_session_update_referrer_tracking(
  connection: api.IConnection,
) {
  // 1. Create a new member
  const memberCreateBody = {
    username: RandomGenerator.name(2).replace(/\s/g, "_").toLowerCase(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    email_verified: true,
  } satisfies IEconomicDiscussionMember.ICreate;

  const member: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Create initial session with basic referrer data
  const sessionCreateBody = {
    href: `https://app.economydiscussion.com/login/success`,
    referrer: `https://app.economydiscussion.com/register`,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEconomicDiscussionMemberSession.ICreate;

  const session: IEconomicDiscussionMemberSession =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: member.member.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 3. Update session referrer to track user journey from login success to dashboard
  const sessionUpdateBody = {
    referrer: `https://app.economydiscussion.com/dashboard`,
  } satisfies IEconomicDiscussionMemberSession.IUpdate;

  const updatedSession: IEconomicDiscussionMemberSession =
    await api.functional.economicDiscussion.member.members.sessions.update(
      connection,
      {
        memberId: member.member.id,
        sessionId: session.id,
        body: sessionUpdateBody,
      },
    );
  typia.assert(updatedSession);

  // 4. Validate updated referrer information
  TestValidator.equals(
    "session ID remains consistent with original session",
    updatedSession.id,
    session.id,
  );
  TestValidator.equals(
    "member ID matches authenticated member",
    updatedSession.member.id,
    member.member.id,
  );
  TestValidator.notEquals(
    "referrer URL updated from original to new destination",
    updatedSession.referrer,
    session.referrer,
  );
  TestValidator.equals(
    "new referrer matches dashboard URI",
    updatedSession.referrer,
    sessionUpdateBody.referrer,
  );
  TestValidator.equals(
    "IP address preserved during update",
    updatedSession.ip,
    session.ip,
  );
  TestValidator.equals(
    "href address preserved during update",
    updatedSession.href,
    session.href,
  );
}
