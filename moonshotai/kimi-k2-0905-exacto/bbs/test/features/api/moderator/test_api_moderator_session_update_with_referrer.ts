import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModeratorSession";

export async function test_api_moderator_session_update_with_referrer(
  connection: api.IConnection,
) {
  // Step 1: Register as a moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: RandomGenerator.pick([
        "junior",
        "senior",
        "lead",
        "admin",
      ] as const),
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a session without referrer
  const sessionWithoutReferrer =
    await api.functional.economicDiscussion.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          href: "/economicDiscussion/moderator/dashboard",
          ip: "192.168.1.100",
        } satisfies IEconomicDiscussionModeratorSession.ICreate,
      },
    );
  typia.assert(sessionWithoutReferrer);

  // Verify initial session has no referrer
  TestValidator.equals(
    "initial session has no referrer",
    sessionWithoutReferrer.referrer,
    undefined,
  );

  // Step 3: Update session to include referrer
  const updatedSession =
    await api.functional.economicDiscussion.moderator.moderators.sessions.update(
      connection,
      {
        moderatorId: moderator.id,
        sessionId: sessionWithoutReferrer.id,
        body: {
          referrer: "https://portal.economicdiscussion.com/login",
        } satisfies IEconomicDiscussionModeratorSession.IUpdate,
      },
    );
  typia.assert(updatedSession);

  // Step 4: Validate referrer was added successfully
  TestValidator.equals(
    "session referrer updated",
    updatedSession.referrer,
    "https://portal.economicdiscussion.com/login",
  );
  TestValidator.equals(
    "session id unchanged",
    updatedSession.id,
    sessionWithoutReferrer.id,
  );
  TestValidator.equals(
    "session moderator unchanged",
    updatedSession.moderator.id,
    sessionWithoutReferrer.moderator.id,
  );

  // Test updating referrer to null
  const sessionWithNullReferrer =
    await api.functional.economicDiscussion.moderator.moderators.sessions.update(
      connection,
      {
        moderatorId: moderator.id,
        sessionId: updatedSession.id,
        body: {
          referrer: null,
        } satisfies IEconomicDiscussionModeratorSession.IUpdate,
      },
    );
  typia.assert(sessionWithNullReferrer);

  TestValidator.equals(
    "session referrer set to null",
    sessionWithNullReferrer.referrer,
    null,
  );

  // Validate other session properties remain intact
  TestValidator.equals(
    "session integrity maintained",
    sessionWithNullReferrer.id,
    updatedSession.id,
  );
  TestValidator.equals(
    "session href unchanged",
    sessionWithNullReferrer.href,
    updatedSession.href,
  );
  TestValidator.equals(
    "session ip unchanged",
    sessionWithNullReferrer.ip,
    updatedSession.ip,
  );
  TestValidator.equals(
    "session moderator unchanged",
    sessionWithNullReferrer.moderator.id,
    updatedSession.moderator.id,
  );
}
