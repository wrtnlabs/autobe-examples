import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_platform_admin_appeal_retrieval_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(16),
        administrator_level: "moderator_admin",
        system_permissions: JSON.stringify({
          user_management: { can_view_user_data: true },
          community_oversight: { can_view_community_data: true },
          content_moderation: {
            can_remove_content: true,
            can_manage_reports: true,
          },
          system_configuration: { can_view_system_logs: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
        security_clearance: "medium",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test accessing appeal with invalid/non-existent moderation action ID
  const invalidModerationActionId = typia.random<
    string & tags.Format<"uuid">
  >();
  const validAppealId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should fail when moderation action ID does not exist",
    async () => {
      await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.at(
        connection,
        {
          moderationActionId: invalidModerationActionId,
          appealId: validAppealId,
        },
      );
    },
  );

  // Step 3: Test accessing appeal with valid moderation action ID but invalid appeal ID
  // (Note: In real scenario, this would require a valid moderation action ID from actual data)
  const anotherInvalidAppealId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should fail when appeal ID does not exist for given moderation action",
    async () => {
      await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.at(
        connection,
        {
          moderationActionId: typia.random<string & tags.Format<"uuid">>(),
          appealId: anotherInvalidAppealId,
        },
      );
    },
  );

  // Step 4: Test accessing appeal with both invalid IDs
  await TestValidator.error(
    "should fail when both moderation action and appeal IDs are invalid",
    async () => {
      await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.at(
        connection,
        {
          moderationActionId: typia.random<string & tags.Format<"uuid">>(),
          appealId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
