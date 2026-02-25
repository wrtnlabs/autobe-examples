import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotification";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_system_notifications_create } from "../../../generate/generate_random_community_platform_admin_system_notifications_create";
import { prepare_random_community_platform_system_notification } from "../../../prepare/prepare_random_community_platform_system_notification";

/**
 * Test creating a system notification with non-existent community reference
 * to validate foreign key constraint handling.
 *
 * Steps:
 * 1. Authenticate as admin
 * 2. Generate a valid UUID that doesn't exist in the system
 * 3. Attempt to create notification with invalid community reference
 * 4. Verify system rejects the request with appropriate error
 */
export async function test_api_system_notification_invalid_community_reference(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate a valid UUID that doesn't exist
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to create notification with invalid community reference
  await TestValidator.error(
    "notification creation with non-existent community should fail",
    async () => {
      await generate_random_community_platform_admin_system_notifications_create(
        adminConnection,
        {
          body: {
            notification_type: "platform_announcements",
            title: RandomGenerator.paragraph({ sentences: 2 }),
            message: RandomGenerator.paragraph({ sentences: 5 }),
            priority: "normal",
            status: "pending",
            is_broadcast: false,
            related_community_id: nonExistentCommunityId,
            action_url: null,
          } satisfies ICommunityPlatformSystemNotification.ICreate,
        },
      );
    },
  );
}
