import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModeratorSession";

export async function test_api_moderator_session_privacy_protection(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<64>
      >(),
      moderation_level: "standard",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator1);

  // Step 2: Create second moderator account
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<64>
      >(),
      moderation_level: "advanced",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator2);

  // Step 3: Create session for first moderator
  const session1 =
    await api.functional.economicDiscussion.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderator1.id,
        body: {
          ip: typia.random<string & tags.Format<"ipv4">>(),
          href: "https://admin.economicdiscussion.com/dashboard",
        } satisfies IEconomicDiscussionModeratorSession.ICreate,
      },
    );
  typia.assert(session1);

  // Step 4: Create session for second moderator
  const session2 =
    await api.functional.economicDiscussion.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderator2.id,
        body: {
          ip: typia.random<string & tags.Format<"ipv4">>(),
          href: "https://admin.economicdiscussion.com/analytics",
        } satisfies IEconomicDiscussionModeratorSession.ICreate,
      },
    );
  typia.assert(session2);

  // Step 5: Verify moderator1 can access their own session
  const ownSession1 =
    await api.functional.economicDiscussion.moderator.moderators.sessions.at(
      connection,
      {
        moderatorId: moderator1.id,
        sessionId: session1.id,
      },
    );
  typia.assert(ownSession1);
  TestValidator.equals(
    "Moderator 1 can access own session ID",
    ownSession1.id,
    session1.id,
  );
  TestValidator.equals(
    "Moderator 1 can access own moderator ID",
    ownSession1.moderator.id,
    moderator1.id,
  );

  // Step 6: Verify moderator2 can access their own session
  const ownSession2 =
    await api.functional.economicDiscussion.moderator.moderators.sessions.at(
      connection,
      {
        moderatorId: moderator2.id,
        sessionId: session2.id,
      },
    );
  typia.assert(ownSession2);
  TestValidator.equals(
    "Moderator 2 can access own session ID",
    ownSession2.id,
    session2.id,
  );
  TestValidator.equals(
    "Moderator 2 can access own moderator ID",
    ownSession2.moderator.id,
    moderator2.id,
  );

  // Step 7: Verify moderator1 cannot access moderator2's session (privacy enforcement check)
  await TestValidator.error(
    "Cross-account session access should be blocked for moderator 1",
    async () => {
      await api.functional.economicDiscussion.moderator.moderators.sessions.at(
        connection,
        {
          moderatorId: moderator2.id,
          sessionId: session2.id,
        },
      );
    },
  );

  // Step 8: Verify moderator2 cannot access moderator1's session (privacy enforcement check)
  await TestValidator.error(
    "Cross-account session access should be blocked for moderator 2",
    async () => {
      await api.functional.economicDiscussion.moderator.moderators.sessions.at(
        connection,
        {
          moderatorId: moderator1.id,
          sessionId: session1.id,
        },
      );
    },
  );

  // Step 9: Verify session uniqueness and data separation between moderators
  TestValidator.notEquals(
    "Sessions have different IDs",
    session1.id,
    session2.id,
  );
  TestValidator.notEquals(
    "Sessions have different moderator owners",
    session1.moderator.id,
    session2.moderator.id,
  );
  TestValidator.notEquals(
    "Sessions track different IPs",
    session1.ip,
    session2.ip,
  );
  TestValidator.notEquals(
    "Sessions access different endpoints",
    session1.href,
    session2.href,
  );

  // Step 10: Verify session metadata fields contain expected values
  TestValidator.predicate(
    "Session 1 tracks correct moderator info",
    session1.moderator.id === moderator1.id &&
      session1.moderator.moderation_level === "standard",
  );
  TestValidator.predicate(
    "Session 2 tracks correct moderator info",
    session2.moderator.id === moderator2.id &&
      session2.moderator.moderation_level === "advanced",
  );

  // Step 11: Verify both sessions have valid creation timestamps
  TestValidator.predicate(
    "Session 1 has valid creation timestamp",
    session1.created_at !== null && !isNaN(Date.parse(session1.created_at)),
  );
  TestValidator.predicate(
    "Session 2 has valid creation timestamp",
    session2.created_at !== null && !isNaN(Date.parse(session2.created_at)),
  );

  // Step 12: Boundary test - test with non-existent session ID throws error
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Accessing non-existent session should be blocked",
    async () => {
      await api.functional.economicDiscussion.moderator.moderators.sessions.at(
        connection,
        {
          moderatorId: moderator1.id,
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
}
