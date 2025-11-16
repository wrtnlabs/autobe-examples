import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

/**
 * Test creating multiple sessions for the same member to verify support for
 * multiple device logins. This validates that members can maintain concurrent
 * sessions across different devices or browsers without invalidating existing
 * sessions.
 *
 * Implementation steps:
 *
 * 1. Register a new member account with valid credentials
 * 2. Create first session simulating desktop login with typical session parameters
 * 3. Create second session simulating mobile login with different context metadata
 * 4. Verify both sessions are created successfully with unique identifiers
 * 5. Validate session member data consistency across both sessions
 * 6. Confirm different session contexts are properly isolated
 *
 * This ensures the platform supports modern multi-device usage patterns where
 * users access the discussion board from smartphones, tablets, and desktops
 * simultaneously.
 */
export async function test_api_member_session_creation_multiple_sessions_allowed(
  connection: api.IConnection,
) {
  // Step 1: Create member account through registration
  const memberData = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
  } satisfies IEconomicDiscussionMember.ICreate;

  const authorizedMember: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(authorizedMember);

  // Step 2: Create first session (desktop login)
  const desktopSessionRequest = {
    href: "https://discussion-board.com/login",
    ip: "192.168.1.100",
    referrer: "https://discussion-board.com/",
  } satisfies IEconomicDiscussionMemberSession.ICreate;

  const desktopSession: IEconomicDiscussionMemberSession =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: authorizedMember.member.id,
        body: desktopSessionRequest,
      },
    );
  typia.assert(desktopSession);

  // Step 3: Create second session for same member (mobile login)
  const mobileSessionRequest = {
    href: "https://discussion-board.com/mobile/login",
    ip: "203.0.113.42",
    referrer: "https://discussion-board.com/articles",
  } satisfies IEconomicDiscussionMemberSession.ICreate;

  const mobileSession: IEconomicDiscussionMemberSession =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: authorizedMember.member.id,
        body: mobileSessionRequest,
      },
    );
  typia.assert(mobileSession);

  // Step 4: Validate both sessions have unique identifiers
  TestValidator.notEquals(
    "Sessions have different IDs",
    desktopSession.id,
    mobileSession.id,
  );

  // Step 5: Validate member data consistency
  TestValidator.equals(
    "Both sessions reference same member",
    desktopSession.member.id,
    mobileSession.member.id,
  );
  TestValidator.equals(
    "Member username consistent across sessions",
    desktopSession.member.username,
    mobileSession.member.username,
  );

  // Step 6: Validate session context isolation
  TestValidator.notEquals(
    "Sessions have different IPs",
    desktopSession.ip,
    mobileSession.ip,
  );
  TestValidator.notEquals(
    "Sessions have different hrefs",
    desktopSession.href,
    mobileSession.href,
  );
  TestValidator.notEquals(
    "Sessions have different referrers",
    desktopSession.referrer,
    mobileSession.referrer,
  );

  TestValidator.predicate(
    "Both sessions have creation timestamps",
    desktopSession.created_at !== null && mobileSession.created_at !== null,
  );
}
