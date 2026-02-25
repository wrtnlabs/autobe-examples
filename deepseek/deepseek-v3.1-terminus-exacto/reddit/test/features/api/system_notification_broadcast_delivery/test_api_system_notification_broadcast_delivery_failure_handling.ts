import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotification";
import type { ICommunityPlatformSystemNotificationBroadcastDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotificationBroadcastDelivery";
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
 * Test handling broadcast delivery failures and error tracking.
 * Create a broadcast notification and simulate delivery failures by updating
 * failed_count and error_message fields. Verify that the system properly tracks
 * delivery metrics when notifications fail to reach users. Test updating
 * delivery_status to 'failed' with appropriate error messages and completion
 * timestamps. Validate that partial failures (some users delivered, some failed)
 * are accurately tracked with separate delivered_count and failed_count fields.
 */
export async function test_api_system_notification_broadcast_delivery_failure_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a broadcast notification
  const notification =
    await generate_random_community_platform_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          notification_type: "platform_announcements",
          title: RandomGenerator.paragraph({ sentences: 1 }),
          message: RandomGenerator.content({ paragraphs: 2 }),
          priority: "normal",
          status: "pending",
          is_broadcast: true,
        } satisfies ICommunityPlatformSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // 3. Simulate delivery failure scenario
  const updateFailureBody: ICommunityPlatformSystemNotificationBroadcastDelivery.IUpdate =
    {
      delivery_status: "failed",
      delivered_count: 50 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
      failed_count: 150 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
      error_message: "Network timeout for 150 user connections",
      completed_at: new Date().toISOString(),
      started_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    };
  // 4. Update broadcast delivery tracking with failure metrics
  const updatedDelivery =
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.patchBySystemnotificationid(
      adminConnection,
      {
        systemNotificationId: notification.id,
        body: updateFailureBody,
      },
    );
  typia.assert(updatedDelivery);
  // 5. Validate failure metrics
  TestValidator.equals(
    "delivery status should be failed",
    updatedDelivery.delivery_status,
    "failed",
  );
  TestValidator.equals(
    "delivered count should match update",
    updatedDelivery.delivered_count,
    50,
  );
  TestValidator.equals(
    "failed count should match update",
    updatedDelivery.failed_count,
    150,
  );
  TestValidator.equals(
    "error message should be set",
    updatedDelivery.error_message,
    "Network timeout for 150 user connections",
  );
  TestValidator.predicate(
    "completed_at should be set",
    updatedDelivery.completed_at !== null,
  );
  TestValidator.predicate(
    "started_at should be set",
    updatedDelivery.started_at !== null,
  );
  // 6. Test partial delivery scenario
  const updatePartialBody: ICommunityPlatformSystemNotificationBroadcastDelivery.IUpdate =
    {
      delivered_count: 800 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
      failed_count: 200 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
      delivery_status: "completed",
      completed_at: new Date().toISOString(),
    };
  const partialDelivery =
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.patchBySystemnotificationid(
      adminConnection,
      {
        systemNotificationId: notification.id,
        body: updatePartialBody,
      },
    );
  typia.assert(partialDelivery);
  // 7. Validate partial delivery metrics
  TestValidator.equals(
    "partial delivered count",
    partialDelivery.delivered_count,
    800,
  );
  TestValidator.equals(
    "partial failed count",
    partialDelivery.failed_count,
    200,
  );
  TestValidator.equals(
    "total recipients calculation",
    partialDelivery.delivered_count + partialDelivery.failed_count,
    partialDelivery.total_recipients,
  );
  TestValidator.predicate(
    "delivered + failed equals total",
    partialDelivery.delivered_count + partialDelivery.failed_count ===
      partialDelivery.total_recipients,
  );
  // 8. Test error handling for invalid transitions
  await TestValidator.error(
    "should reject invalid status transition if exists",
    async () => {
      // Attempt to set impossible status (if business logic enforces)
      const invalidUpdate: ICommunityPlatformSystemNotificationBroadcastDelivery.IUpdate =
        {
          delivery_status: "pending",
        };
      await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.patchBySystemnotificationid(
        adminConnection,
        {
          systemNotificationId: notification.id,
          body: invalidUpdate,
        },
      );
    },
  );
}
