import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModeratorSession";

/**
 * Test updating an existing moderator session with a new IP address to simulate
 * legitimate session continuation from a different network location.
 *
 * This test validates session update functionality while maintaining audit
 * trail requirements and security tracking.
 *
 * Test flow:
 *
 * 1. Register a new moderator account to establish administrative privileges
 * 2. Create an initial moderator session with base IP address
 * 3. Update the session with a new IP address to simulate network change
 * 4. Verify the session reflects the updated IP address while maintaining other
 *    properties
 * 5. Validate that the update operation maintains session integrity and tracking
 */
export async function test_api_moderator_session_update_ip_address(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorCreateData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    moderation_level: "senior",
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(moderator);

  // Step 2: Create initial moderator session with base IP
  const initialSessionData = {
    ip: "192.168.1.100",
    href: "/economicDiscussion/moderator/dashboard",
    referrer: "https://example.com/login",
  } satisfies IEconomicDiscussionModeratorSession.ICreate;

  const initialSession: IEconomicDiscussionModeratorSession =
    await api.functional.economicDiscussion.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderator.id,
        body: initialSessionData,
      },
    );
  typia.assert(initialSession);

  // Validate initial session properties
  TestValidator.equals(
    "initial session IP matches",
    initialSession.ip,
    "192.168.1.100",
  );
  TestValidator.equals(
    "initial session href matches",
    initialSession.href,
    "/economicDiscussion/moderator/dashboard",
  );
  TestValidator.equals(
    "initial session moderator ID",
    initialSession.moderator.id,
    moderator.id,
  );

  // Step 3: Update session with new IP address (simulating network change)
  const updatedSessionData = {
    ip: "10.0.0.50",
    href: "/economicDiscussion/moderator/content-management",
    referrer: null,
  } satisfies IEconomicDiscussionModeratorSession.IUpdate;

  const updatedSession: IEconomicDiscussionModeratorSession =
    await api.functional.economicDiscussion.moderator.moderators.sessions.update(
      connection,
      {
        moderatorId: moderator.id,
        sessionId: initialSession.id,
        body: updatedSessionData,
      },
    );
  typia.assert(updatedSession);

  // Step 4: Verify session reflects updated IP address
  TestValidator.equals(
    "updated session IP changed",
    updatedSession.ip,
    "10.0.0.50",
  );
  TestValidator.equals(
    "updated session href changed",
    updatedSession.href,
    "/economicDiscussion/moderator/content-management",
  );
  TestValidator.equals(
    "updated session referrer is null",
    updatedSession.referrer,
    null,
  );
  TestValidator.equals(
    "session ID remains same",
    updatedSession.id,
    initialSession.id,
  );
  TestValidator.equals(
    "moderator reference remains same",
    updatedSession.moderator.id,
    moderator.id,
  );

  // Step 5: Validate audit trail properties are maintained
  TestValidator.predicate(
    "created_at timestamp exists",
    updatedSession.created_at !== null,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedSession.created_at),
  );
  TestValidator.predicate(
    "session has moderator summary",
    updatedSession.moderator !== null,
  );
}
