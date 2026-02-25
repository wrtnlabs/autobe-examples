import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test authorization enforcement for moderation queue updates.
 * 1. Authenticate as regular user and attempt unauthorized update (expect 403)
 * 2. Authenticate as admin and test non-existent ID (expect 404)
 * 3. Test invalid workflow state transitions with proper authorization
 * 4. Verify error responses contain appropriate status codes
 */
export async function test_api_moderation_queues_update_authorization_validation(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Regular user unauthorized access
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Test unauthorized access with valid but non-existent ID
  await TestValidator.httpError(
    "regular user should get 403 Forbidden",
    403,
    async () => {
      await api.functional.communityPlatform.admin.moderation_queues.update(
        userConnection,
        {
          moderationQueueId: nonExistentId,
          body: {
            status: "assigned",
            priority: "normal",
          } satisfies ICommunityPlatformModerationQueue.IUpdate,
        },
      );
    },
  );
  // Test 2: Admin authentication and non-existent ID
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: "full",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test non-existent moderation queue ID returns 404
  await TestValidator.httpError(
    "non-existent moderation queue should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.moderation_queues.update(
        adminConnection,
        {
          moderationQueueId: nonExistentId,
          body: {
            status: "assigned",
            priority: "normal",
          } satisfies ICommunityPlatformModerationQueue.IUpdate,
        },
      );
    },
  );
  // Test 3: Invalid workflow state transitions
  // Attempt to jump directly to resolved state (invalid transition)
  await TestValidator.httpError(
    "invalid workflow transition should be rejected",
    400,
    async () => {
      await api.functional.communityPlatform.admin.moderation_queues.update(
        adminConnection,
        {
          moderationQueueId: nonExistentId,
          body: {
            status: "resolved",
            resolution: "approved",
            resolutionReason: "Invalid direct transition",
          } satisfies ICommunityPlatformModerationQueue.IUpdate,
        },
      );
    },
  );
  // Test 4: Missing required fields for resolution
  await TestValidator.httpError(
    "missing required resolution fields should be rejected",
    400,
    async () => {
      await api.functional.communityPlatform.admin.moderation_queues.update(
        adminConnection,
        {
          moderationQueueId: nonExistentId,
          body: {
            status: "resolved",
            // Missing resolution and resolutionReason
          } satisfies ICommunityPlatformModerationQueue.IUpdate,
        },
      );
    },
  );
}
