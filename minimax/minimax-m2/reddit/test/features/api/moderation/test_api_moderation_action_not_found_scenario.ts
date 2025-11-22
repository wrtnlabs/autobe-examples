import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_moderation_action_not_found_scenario(
  connection: api.IConnection,
) {
  // 1. Create platform administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.platformAdministrator.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(),
        email: adminEmail,
        password: "AdminPassword123!",
        administrator_level: "super_admin",
        system_permissions: JSON.stringify({
          user_management: { can_view_user_data: true },
          community_oversight: { can_view_community_data: true },
          content_moderation: { can_remove_content: true },
          system_configuration: { can_view_system_logs: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Generate a non-existent moderation action ID (using a random UUID)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to retrieve the non-existent moderation action and verify error handling
  await TestValidator.error(
    "should fail to retrieve non-existent moderation action",
    async () => {
      await api.functional.redditPlatform.platformAdministrator.moderationActions.at(
        connection,
        {
          moderationActionId: nonExistentId,
        },
      );
    },
  );
}
