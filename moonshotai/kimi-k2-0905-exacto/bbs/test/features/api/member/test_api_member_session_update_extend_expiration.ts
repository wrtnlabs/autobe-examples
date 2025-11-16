import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

/**
 * Test extending session expiration time when a member needs longer active
 * session duration.
 *
 * This test validates session lifecycle management for economic discussion
 * board members who require extended active periods. It verifies that a member
 * authentication session's expiration time can be updated to prevent premature
 * session termination, ensuring users can maintain continuous access to
 * community features without interruption.
 *
 * The test demonstrates the complete workflow of:
 *
 * 1. Creating a new member account through automatic registration
 * 2. Establishing an authentication session with initial context
 * 3. Updating the session's expiration timestamp to extend active duration
 * 4. Verifying the updated session maintains all member association and metadata
 *
 * This validates the session lifecycle management system's ability to handle
 * time-based session extensions, which is critical for user experience when
 * members need prolonged access to discussion features.
 */
export async function test_api_member_session_update_extend_expiration(
  connection: api.IConnection,
) {
  // Step 1: Create member account using automatic registration join
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const memberAuth: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(memberAuth);

  // Step 2: Create initial authentication session for the member
  const currentHref = "https://economic-discussion.example.com/member/login";
  const currentIp = "192.168.1.100";

  const sessionCreateBody = {
    href: currentHref,
    ip: currentIp,
    referrer: "https://economic-discussion.example.com/login",
  } satisfies IEconomicDiscussionMemberSession.ICreate;

  const baseSession: IEconomicDiscussionMemberSession =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: memberAuth.member.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(baseSession);

  // Step 3: Update session to extend expiration time
  const futureExpiration = new Date(Date.now() + 7200000).toISOString(); // 2 hours from now

  const sessionUpdateBody = {
    expired_at: futureExpiration,
  } satisfies IEconomicDiscussionMemberSession.IUpdate;

  const updatedSession: IEconomicDiscussionMemberSession =
    await api.functional.economicDiscussion.member.members.sessions.update(
      connection,
      {
        memberId: memberAuth.member.id,
        sessionId: baseSession.id,
        body: sessionUpdateBody,
      },
    );
  typia.assert(updatedSession);

  // Step 4: Validate the session extension was successful
  TestValidator.equals(
    "session ID remains constant",
    updatedSession.id,
    baseSession.id,
  );
  TestValidator.equals(
    "member association maintained",
    updatedSession.member.id,
    memberAuth.member.id,
  );
  TestValidator.predicate(
    "expiration extended to future",
    () =>
      new Date(updatedSession.expired_at!).getTime() ===
      new Date(futureExpiration).getTime(),
  );

  // Validate session metadata integrity
  TestValidator.equals(
    "IP address preserved",
    updatedSession.ip,
    baseSession.ip,
  );
  TestValidator.equals(
    "href context maintained",
    updatedSession.href,
    baseSession.href,
  );
  TestValidator.notEquals(
    "expiration timestamp updated",
    updatedSession.expired_at,
    baseSession.expired_at,
  );
}
