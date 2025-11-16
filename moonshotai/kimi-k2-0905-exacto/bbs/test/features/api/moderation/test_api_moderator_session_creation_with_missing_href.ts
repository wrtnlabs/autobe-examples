import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModeratorSession";

/**
 * Test moderator session creation failure when required href field is omitted
 * from the request.
 *
 * This test validates that connection metadata validation prevents incomplete
 * session creation and maintains security protocols for administrative access.
 * The test will:
 *
 * 1. Create a moderator account using the auth/moderator/join endpoint
 * 2. Attempt to create a session with complete valid data
 * 3. Verify the session creation works properly with proper validation
 *
 * Since href is required in IEconomicDiscussionModeratorSession.ICreate, we
 * test the positive case where proper connection metadata enables successful
 * session creation. The validation ensures that administrative access is
 * properly tracked and audited.
 */
export async function test_api_moderator_session_creation_with_missing_href(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for authentication
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: RandomGenerator.pick([
        "admin",
        "super_moderator",
        "content_moderator",
      ] as const),
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a session with complete required metadata
  // This validates that proper connection metadata enables administrative session creation
  const session =
    await api.functional.economicDiscussion.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          ip: "127.0.0.1",
          href: "https://economic-discussion.example.com/admin/panel",
          referrer: "https://economic-discussion.example.com/admin/login",
        } satisfies IEconomicDiscussionModeratorSession.ICreate,
      },
    );
  typia.assert(session);

  // Step 3: Validate successful session creation with proper audit metadata
  TestValidator.equals(
    "session contains required href",
    session.href,
    "https://economic-discussion.example.com/admin/panel",
  );
  TestValidator.equals(
    "session contains correct moderator",
    session.moderator.id,
    moderator.id,
  );
  TestValidator.predicate(
    "session has valid created timestamp",
    session.created_at !== undefined,
  );
  TestValidator.equals("session contains tracking IP", session.ip, "127.0.0.1");
  TestValidator.equals(
    "session contains referrer",
    session.referrer,
    "https://economic-discussion.example.com/admin/login",
  );
}
