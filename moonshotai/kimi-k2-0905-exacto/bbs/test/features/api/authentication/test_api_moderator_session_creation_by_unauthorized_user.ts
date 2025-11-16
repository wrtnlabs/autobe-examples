import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModeratorSession";

/**
 * Test that unauthorized users cannot create moderator sessions for
 * administrative access.
 *
 * This test validates access control enforcement by verifying that moderator
 * session creation requires proper authentication. The security-focused
 * workflow ensures that administrative privileges are properly protected
 * through authentication mechanisms.
 *
 * Test Steps:
 *
 * 1. Register a moderator account to establish baseline user context
 * 2. Attempt to create moderator session without proper authentication context
 * 3. Verify that unauthorized session creation is rejected by the access control
 *    system
 *
 * This security validation ensures that the platform maintains strict
 * authorization boundaries for administrative functions, protecting moderator
 * capabilities from unauthorized access.
 */
export async function test_api_moderator_session_creation_by_unauthorized_user(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for baseline context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    username: RandomGenerator.alphabets(8),
    email: moderatorEmail,
    password_hash: RandomGenerator.alphaNumeric(12),
    moderation_level: "standard" as const,
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  TestValidator.equals(
    "moderator registration success",
    moderator.email_verified,
    true,
  );

  // Step 2: Attempt to create moderator session without authorization context
  // Clear authentication to ensure unauthorized context
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 3: Verify that unauthorized session creation fails
  await TestValidator.error(
    "unauthorized moderator session creation should fail",
    async () => {
      await api.functional.economicDiscussion.moderator.moderators.sessions.create(
        unauthConnection,
        {
          moderatorId: moderator.id,
          body: {
            ip: "127.0.0.1",
            href: "/economicDiscussion/moderator",
            referrer: null,
          } satisfies IEconomicDiscussionModeratorSession.ICreate,
        },
      );
    },
  );
}
