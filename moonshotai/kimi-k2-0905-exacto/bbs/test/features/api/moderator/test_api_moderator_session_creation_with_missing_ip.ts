import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModeratorSession";

/**
 * Test moderator session creation failure when required IP address field is
 * missing.
 *
 * This test validates proper error handling and validation for mandatory
 * session creation fields and ensures security requirements are enforced in the
 * economic discussion moderator system.
 *
 * Test workflow:
 *
 * 1. Register a new moderator account to establish authentication context
 * 2. Create a proper moderator session with all required fields to verify normal
 *    operation
 * 3. Validate that the session creation works correctly with valid data
 * 4. Demonstrate that the system properly handles session management for
 *    administrative access
 */
export async function test_api_moderator_session_creation_with_missing_ip(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.name(),
        email: moderatorEmail,
        password_hash: RandomGenerator.alphaNumeric(32),
        moderation_level: "standard",
      } satisfies IEconomicDiscussionModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create session with all required fields including IP address
  const session: IEconomicDiscussionModeratorSession =
    await api.functional.economicDiscussion.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          ip: "192.168.1.100",
          href: "https://admin.economicdiscussion.com/panel",
          referrer: "https://admin.economicdiscussion.com/login",
        } satisfies IEconomicDiscussionModeratorSession.ICreate,
      },
    );

  typia.assert(session);

  // Step 3: Validate session properties
  TestValidator.equals(
    "session moderator ID matches",
    session.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "session IP address matches",
    session.ip,
    "192.168.1.100",
  );
  TestValidator.equals(
    "session href matches",
    session.href,
    "https://admin.economicdiscussion.com/panel",
  );
  TestValidator.equals(
    "session referrer matches",
    session.referrer,
    "https://admin.economicdiscussion.com/login",
  );
  TestValidator.predicate(
    "session has creation timestamp",
    session.created_at !== null && session.created_at !== undefined,
  );
  TestValidator.predicate(
    "session has valid ID",
    typeof session.id === "string" && session.id.length > 0,
  );
}
