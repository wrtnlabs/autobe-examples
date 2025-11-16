import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModeratorSession";

/**
 * Test successful creation of a new moderator session with valid session data
 * including IP address and href.
 *
 * This test validates the complete workflow of moderator session creation:
 *
 * 1. Create a new moderator account through the registration endpoint
 * 2. Verify the moderator is authenticated and has proper authorization
 * 3. Create a new session with valid session data including IP address and href
 * 4. Validate that the session is properly created with all required metadata
 * 5. Verify the session contains authentication tokens and is ready for
 *    administrative access
 *
 * The test ensures that moderator sessions are properly tracked for audit
 * logging and that all session metadata is correctly captured for security
 * monitoring.
 */
export async function test_api_moderator_session_creation_with_valid_data(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to establish authentication
  const moderatorData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    moderation_level: RandomGenerator.pick([
      "admin",
      "moderator",
      "supervisor",
    ] as const),
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Verify moderator authentication was successful
  TestValidator.equals("moderator has valid ID", typeof moderator.id, "string");
  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderatorData.username,
  );
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorData.email,
  );
  TestValidator.predicate(
    "moderator has authorization token",
    !!moderator.token.access,
  );

  // Step 3: Create session with valid session data
  const sessionData = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: `https://example.com/admin/moderator/${moderator.id}/dashboard`,
    referrer: `https://example.com/admin/login`,
  } satisfies IEconomicDiscussionModeratorSession.ICreate;

  const session: IEconomicDiscussionModeratorSession =
    await api.functional.economicDiscussion.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderator.id,
        body: sessionData,
      },
    );
  typia.assert(session);

  // Step 4: Validate session creation and metadata
  TestValidator.equals("session has valid ID", typeof session.id, "string");
  TestValidator.equals(
    "session IP matches request",
    session.ip,
    sessionData.ip,
  );
  TestValidator.equals(
    "session href matches request",
    session.href,
    sessionData.href,
  );
  TestValidator.equals(
    "session referrer matches request",
    session.referrer,
    sessionData.referrer,
  );
  TestValidator.equals(
    "session moderator ID matches",
    session.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "session moderator username matches",
    session.moderator.username,
    moderator.username,
  );

  // Step 5: Verify session timestamps and audit information
  TestValidator.predicate(
    "session has creation timestamp",
    !!session.created_at,
  );
  TestValidator.predicate(
    "session creation timestamp is valid date",
    !isNaN(Date.parse(session.created_at)),
  );

  // Verify moderator summary information in session
  TestValidator.equals(
    "session moderator has valid summary",
    typeof session.moderator.id,
    "string",
  );
  TestValidator.equals(
    "session moderator email verified status matches",
    session.moderator.email_verified,
    moderator.email_verified,
  );
  TestValidator.equals(
    "session moderator two-factor status matches",
    session.moderator.two_factor_enabled,
    moderator.two_factor_enabled,
  );
  TestValidator.equals(
    "session moderator level matches",
    session.moderator.moderation_level,
    moderator.moderation_level,
  );
}
