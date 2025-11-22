import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Validate that unauthorized users cannot access moderation action details.
 *
 * This test ensures proper security controls are in place by verifying that
 * regular users without platform administrator privileges receive appropriate
 * access denied responses when attempting to view sensitive moderation
 * information.
 *
 * The test validates the security boundary between regular users and
 * administrative functions, ensuring that platform governance data remains
 * protected from unauthorized access.
 */
export async function test_api_moderation_action_unauthorized_access_attempt(
  connection: api.IConnection,
) {
  // Step 1: Create a platform administrator account (authorized user)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: "Platform Administrator",
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: { can_create_users: true, can_modify_users: true },
          community_oversight: { can_create_communities: true },
          content_moderation: { can_remove_content: true },
        }),
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a regular registered user account (unauthorized user)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(8)}`,
        email: userEmail,
        password: "UserPassword123!",
        display_name: "Regular User",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 3: Generate a valid moderation action ID for testing
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Login as the regular user (unauthorized for moderation actions)
  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: userEmail,
      password: "UserPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformRegisteredUser.ILogin,
  });

  // Step 5: Verify unauthorized access attempt is properly rejected
  await TestValidator.error(
    "unauthorized user cannot access moderation action details",
    async () => {
      await api.functional.redditPlatform.platformAdministrator.moderationActions.at(
        connection,
        {
          moderationActionId: moderationActionId,
        },
      );
    },
  );
}
