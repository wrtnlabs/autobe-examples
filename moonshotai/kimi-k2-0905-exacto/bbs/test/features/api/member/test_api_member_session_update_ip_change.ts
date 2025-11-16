import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

/**
 * Test updating a member session when their IP address changes during active
 * session. This validates security tracking when users switch networks (e.g.,
 * moving from WiFi to mobile data). Verifies that the session IP field is
 * properly updated while maintaining session integrity and authentication
 * status.
 */
export async function test_api_member_session_update_ip_change(
  connection: api.IConnection,
) {
  // Step 1: Register new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const newMember: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: memberEmail,
        password: "securePassword123",
        email_verified: true,
      } satisfies IEconomicDiscussionMember.ICreate,
    });
  typia.assert(newMember);

  // Step 2: Create initial session with original IP
  const originalIp = "192.168.1.100";
  const initialSession: IEconomicDiscussionMemberSession =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: newMember.member.id,
        body: {
          href: "https://economic-discussion.example.com/login",
          ip: originalIp,
          referrer: "https://economic-discussion.example.com/register",
        } satisfies IEconomicDiscussionMemberSession.ICreate,
      },
    );
  typia.assert(initialSession);

  // Verify initial session was created with correct IP
  TestValidator.equals(
    "initial session IP matches original",
    initialSession.ip,
    originalIp,
  );

  // Step 3: Update session with new IP (simulating network change)
  const newIp = "10.0.0.50";
  const updatedSession: IEconomicDiscussionMemberSession =
    await api.functional.economicDiscussion.member.members.sessions.update(
      connection,
      {
        memberId: newMember.member.id,
        sessionId: initialSession.id,
        body: {
          ip: newIp,
        } satisfies IEconomicDiscussionMemberSession.IUpdate,
      },
    );
  typia.assert(updatedSession);

  // Step 4: Verify session was updated correctly
  TestValidator.equals(
    "updated session IP matches new IP",
    updatedSession.ip,
    newIp,
  );
  TestValidator.equals(
    "session ID remains the same",
    updatedSession.id,
    initialSession.id,
  );
  TestValidator.equals(
    "member association preserved",
    updatedSession.member.id,
    newMember.member.id,
  );

  // Verify other session properties remain intact
  TestValidator.equals(
    "session href unchanged",
    updatedSession.href,
    initialSession.href,
  );
  TestValidator.equals(
    "session referrer unchanged",
    updatedSession.referrer,
    initialSession.referrer,
  );
  TestValidator.equals(
    "session creation time unchanged",
    updatedSession.created_at,
    initialSession.created_at,
  );

  // Step 5: Test edge case - clear IP address
  const sessionWithClearedIp: IEconomicDiscussionMemberSession =
    await api.functional.economicDiscussion.member.members.sessions.update(
      connection,
      {
        memberId: newMember.member.id,
        sessionId: initialSession.id,
        body: {
          ip: null,
        } satisfies IEconomicDiscussionMemberSession.IUpdate,
      },
    );
  typia.assert(sessionWithClearedIp);

  TestValidator.equals(
    "IP can be cleared to null",
    sessionWithClearedIp.ip,
    null,
  );
}
