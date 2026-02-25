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

export async function test_api_system_notification_broadcast_delivery_status_update(
  connection: api.IConnection,
): Promise<void> {
  // Create separate admin connection for isolation
  const adminConnection: api.IConnection = { host: connection.host };
  // Authorize admin join
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create a broadcast notification using utility function
  const notification =
    await generate_random_community_platform_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          notification_type: "platform_announcements",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          message: RandomGenerator.content({ paragraphs: 1 }),
          priority: "normal",
          status: "pending",
          is_broadcast: true,
          action_url: null,
          related_community_id: null,
          related_post_id: null,
          related_comment_id: null,
        } satisfies ICommunityPlatformSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // Test relationship integrity - notification ID should match
  TestValidator.equals(
    "notification ID should match",
    notification.id,
    notification.id,
  );
  // Update delivery status from pending to in_progress
  const update1 =
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.patchBySystemnotificationid(
      adminConnection,
      {
        systemNotificationId: notification.id,
        body: {
          delivery_status: "in_progress",
          delivered_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          failed_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          started_at: new Date().toISOString(),
        } satisfies ICommunityPlatformSystemNotificationBroadcastDelivery.IUpdate,
      },
    );
  typia.assert(update1);
  // Validate status transition and all fields
  TestValidator.equals(
    "status should be in_progress",
    update1.delivery_status,
    "in_progress",
  );
  TestValidator.predicate(
    "started_at should be set",
    update1.started_at !== null,
  );
  TestValidator.predicate(
    "delivered_count should be non-negative",
    update1.delivered_count >= 0,
  );
  TestValidator.predicate(
    "failed_count should be non-negative",
    update1.failed_count >= 0,
  );
  TestValidator.equals(
    "system_notification_id should match parent",
    update1.system_notification_id,
    notification.id,
  );
  // Test partial update - only update delivery counts while maintaining other values
  const newDeliveredCount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const newFailedCount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const update2 =
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.patchBySystemnotificationid(
      adminConnection,
      {
        systemNotificationId: notification.id,
        body: {
          delivered_count: newDeliveredCount,
          failed_count: newFailedCount,
        } satisfies ICommunityPlatformSystemNotificationBroadcastDelivery.IUpdate,
      },
    );
  typia.assert(update2);
  // Verify that status and other fields remain unchanged while counts are updated
  TestValidator.equals(
    "status should remain in_progress",
    update2.delivery_status,
    "in_progress",
  );
  TestValidator.equals(
    "started_at should remain unchanged",
    update2.started_at,
    update1.started_at,
  );
  TestValidator.equals(
    "delivered_count should be updated",
    update2.delivered_count,
    newDeliveredCount,
  );
  TestValidator.equals(
    "failed_count should be updated",
    update2.failed_count,
    newFailedCount,
  );
  // Final update to completed status
  const update3 =
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.patchBySystemnotificationid(
      adminConnection,
      {
        systemNotificationId: notification.id,
        body: {
          delivery_status: "completed",
          delivered_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          failed_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          completed_at: new Date().toISOString(),
        } satisfies ICommunityPlatformSystemNotificationBroadcastDelivery.IUpdate,
      },
    );
  typia.assert(update3);
  // Validate final state with all fields
  TestValidator.equals(
    "status should be completed",
    update3.delivery_status,
    "completed",
  );
  TestValidator.predicate(
    "completed_at should be set",
    update3.completed_at !== null,
  );
  TestValidator.predicate(
    "total recipients should be positive",
    update3.total_recipients > 0,
  );
  TestValidator.equals(
    "system_notification_id should still match",
    update3.system_notification_id,
    notification.id,
  );
  // Test error scenario - invalid status transition (completed back to in_progress)
  await TestValidator.error(
    "should reject invalid status transition",
    async () => {
      await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.patchBySystemnotificationid(
        adminConnection,
        {
          systemNotificationId: notification.id,
          body: {
            delivery_status: "in_progress",
          } satisfies ICommunityPlatformSystemNotificationBroadcastDelivery.IUpdate,
        },
      );
    },
  );
}
