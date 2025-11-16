import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModeratorSession";

/**
 * Test that retrieved moderator session details contain all required metadata
 * fields for comprehensive administrative monitoring.
 *
 * This test validates the completeness of session records including creation
 * timestamps, expiration times, moderator attribution, and connection context
 * data required for full administrative oversight and audit trail maintenance.
 *
 * The test follows this workflow:
 *
 * 1. Create a moderator account to establish administrative access
 * 2. Create a moderator session with rich metadata including IP, href, and
 *    referrer
 * 3. Retrieve the session details using the at() endpoint
 * 4. Validate all metadata fields are present and correctly formatted
 * 5. Verify session ownership and relationship to the moderator
 * 6. Test error handling for invalid session access
 */
export async function test_api_moderator_session_metadata_completeness(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account for session testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      email_verified: true,
      two_factor_enabled: true,
      moderation_level: RandomGenerator.pick([
        "basic",
        "advanced",
        "admin",
      ] as const),
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create moderator session with comprehensive metadata
  const sessionHref = `https://discussion.example.com/moderator/panel/${typia.random<string & tags.Format<"uuid">>()}`;
  const sessionIp = typia.random<string & tags.Format<"ipv4">>();
  const sessionReferrer = `https://admin.example.com/login`;

  const session =
    await api.functional.economicDiscussion.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          ip: sessionIp,
          href: sessionHref,
          referrer: sessionReferrer,
        } satisfies IEconomicDiscussionModeratorSession.ICreate,
      },
    );
  typia.assert(session);

  // Step 3: Retrieve session details to validate metadata completeness
  const retrievedSession =
    await api.functional.economicDiscussion.moderator.moderators.sessions.at(
      connection,
      {
        moderatorId: moderator.id,
        sessionId: session.id,
      },
    );
  typia.assert(retrievedSession);

  // Step 4: Validate all metadata fields are present and correctly formatted
  TestValidator.equals("session ID matches", retrievedSession.id, session.id);
  TestValidator.equals(
    "session href matches",
    retrievedSession.href,
    sessionHref,
  );
  TestValidator.equals("session IP matches", retrievedSession.ip, sessionIp);
  TestValidator.equals(
    "session referrer matches",
    retrievedSession.referrer,
    sessionReferrer,
  );
  TestValidator.equals(
    "session creation timestamp present",
    typeof retrievedSession.created_at,
    "string",
  );
  TestValidator.equals(
    "session has expiration timestamp",
    retrievedSession.expired_at !== undefined,
    true,
  );

  // Step 5: Validate moderator attribution and metadata
  TestValidator.equals(
    "moderator ID in session matches",
    retrievedSession.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator username matches",
    retrievedSession.moderator.username,
    moderator.username,
  );
  TestValidator.equals(
    "moderator email verified status",
    retrievedSession.moderator.email_verified,
    moderator.email_verified,
  );
  TestValidator.equals(
    "moderator 2FA status",
    retrievedSession.moderator.two_factor_enabled,
    moderator.two_factor_enabled,
  );
  TestValidator.equals(
    "moderator level matches",
    retrievedSession.moderator.moderation_level,
    moderator.moderation_level,
  );
  TestValidator.equals(
    "moderator creation timestamp present",
    typeof retrievedSession.moderator.created_at,
    "string",
  );

  // Step 6: Test error handling for invalid session access
  const invalidSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail to retrieve session with invalid ID",
    async () => {
      await api.functional.economicDiscussion.moderator.moderators.sessions.at(
        connection,
        {
          moderatorId: moderator.id,
          sessionId: invalidSessionId,
        },
      );
    },
  );

  // Step 7: Test error handling for invalid moderator ID
  const invalidModeratorId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail to retrieve session with invalid moderator ID",
    async () => {
      await api.functional.economicDiscussion.moderator.moderators.sessions.at(
        connection,
        {
          moderatorId: invalidModeratorId,
          sessionId: session.id,
        },
      );
    },
  );
}
