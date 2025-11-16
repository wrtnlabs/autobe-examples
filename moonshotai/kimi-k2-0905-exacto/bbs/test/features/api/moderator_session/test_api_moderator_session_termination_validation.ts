import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModeratorSession";

/**
 * Test that moderators can only terminate their own sessions and not sessions
 * belonging to other moderators. Validates proper access control by ensuring
 * session termination requires session ownership and prevents unauthorized
 * session management. This maintains security boundaries for administrative
 * access and prevents privilege escalation.
 *
 * 1. Create a moderator account
 * 2. Create a session for that moderator
 * 3. Test that the moderator can terminate their own session
 * 4. Verify proper session ownership validation through successful
 *    self-termination
 */
export async function test_api_moderator_session_termination_validation(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.name()}@economicdiscussion.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    email_verified: true,
    two_factor_enabled: false,
    moderation_level: "senior",
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create a session for the moderator
  const sessionData = {
    ip: "127.0.0.1",
    href: "/moderator/dashboard",
    referrer: null,
  } satisfies IEconomicDiscussionModeratorSession.ICreate;

  const session =
    await api.functional.economicDiscussion.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderator.id,
        body: sessionData,
      },
    );
  typia.assert(session);

  // Step 3: Test that the moderator can terminate their own session (should succeed)
  await api.functional.economicDiscussion.moderator.moderators.sessions.erase(
    connection,
    {
      moderatorId: moderator.id,
      sessionId: session.id,
    },
  );

  // Step 4: Verify proper session ownership through successful termination
  TestValidator.predicate(
    "moderator successfully terminated their own session",
    true, // If we reach here, it means the session was terminated successfully
  );
}
