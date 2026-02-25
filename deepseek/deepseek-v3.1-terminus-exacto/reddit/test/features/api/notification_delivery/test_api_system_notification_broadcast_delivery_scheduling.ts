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
 * Test scheduling and timing updates for broadcast notification delivery.
 * Create a broadcast notification and update scheduled delivery times, start times,
 * and completion timestamps. Verify that the system properly manages delivery
 * lifecycle timing including scheduled_at, started_at, and completed_at fields.
 * Test updating delivery metrics while maintaining timing consistency across
 * the delivery workflow. Validate that the system handles concurrent updates
 * and maintains data integrity for delivery timing information.
 */
export async function test_api_system_notification_broadcast_delivery_scheduling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a broadcast notification using utility function
  const notification =
    await generate_random_community_platform_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          notification_type: "platform_announcements",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          message: RandomGenerator.content({ paragraphs: 2 }),
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
  // 3. Initial delivery setup - schedule for future
  const now = new Date();
  const scheduledTime = new Date(now.getTime() + 3600000).toISOString(); // 1 hour from now
  const initialUpdate =
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.patchBySystemnotificationid(
      adminConnection,
      {
        systemNotificationId: notification.id,
        body: {
          delivery_status: "pending",
          delivered_count: 0,
          failed_count: 0,
          scheduled_at: scheduledTime,
          started_at: null,
          completed_at: null,
          error_message: null,
        } satisfies ICommunityPlatformSystemNotificationBroadcastDelivery.IUpdate as any,
      },
    );
  typia.assert(initialUpdate);
  TestValidator.equals(
    "notification id matches",
    initialUpdate.system_notification_id,
    notification.id,
  );
  TestValidator.equals(
    "delivery status pending",
    initialUpdate.delivery_status,
    "pending",
  );
  TestValidator.equals(
    "scheduled at updated",
    initialUpdate.scheduled_at,
    scheduledTime,
  );
  TestValidator.predicate(
    "started at is null",
    initialUpdate.started_at === null,
  );
  TestValidator.predicate(
    "completed at is null",
    initialUpdate.completed_at === null,
  );
  // 4. Update to in_progress with started_at timestamp
  const startTime = new Date().toISOString();
  const progressUpdate =
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.patchBySystemnotificationid(
      adminConnection,
      {
        systemNotificationId: notification.id,
        body: {
          delivery_status: "in_progress",
          started_at: startTime,
          delivered_count: 25,
          failed_count: 2,
        } satisfies ICommunityPlatformSystemNotificationBroadcastDelivery.IUpdate,
      },
    );
  typia.assert(progressUpdate);
  TestValidator.equals(
    "delivery status in_progress",
    progressUpdate.delivery_status,
    "in_progress",
  );
  TestValidator.equals(
    "started at updated",
    progressUpdate.started_at,
    startTime,
  );
  TestValidator.equals(
    "delivered count updated",
    progressUpdate.delivered_count,
    25,
  );
  TestValidator.equals("failed count updated", progressUpdate.failed_count, 2);
  TestValidator.predicate(
    "scheduled at unchanged",
    progressUpdate.scheduled_at === scheduledTime,
  );
  TestValidator.predicate(
    "completed at still null",
    progressUpdate.completed_at === null,
  );
  // 5. Validate timing sequence: scheduled_at <= started_at
  if (
    progressUpdate.scheduled_at !== null &&
    progressUpdate.started_at !== null
  ) {
    const scheduledDate = new Date(progressUpdate.scheduled_at);
    const startedDate = new Date(progressUpdate.started_at);
    TestValidator.predicate(
      "scheduled before started",
      scheduledDate <= startedDate,
    );
  }
  // 6. Update to completed with completion timestamp and final metrics
  const completeTime = new Date().toISOString();
  const completeUpdate =
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.patchBySystemnotificationid(
      adminConnection,
      {
        systemNotificationId: notification.id,
        body: {
          delivery_status: "completed",
          completed_at: completeTime,
          delivered_count: 95,
          failed_count: 5,
          error_message: null,
        } satisfies ICommunityPlatformSystemNotificationBroadcastDelivery.IUpdate,
      },
    );
  typia.assert(completeUpdate);
  TestValidator.equals(
    "delivery status completed",
    completeUpdate.delivery_status,
    "completed",
  );
  TestValidator.equals(
    "completed at updated",
    completeUpdate.completed_at,
    completeTime,
  );
  TestValidator.equals(
    "final delivered count",
    completeUpdate.delivered_count,
    95,
  );
  TestValidator.equals("final failed count", completeUpdate.failed_count, 5);
  TestValidator.predicate(
    "error message cleared",
    completeUpdate.error_message === null,
  );
  // 7. Validate final timing sequence: scheduled_at <= started_at <= completed_at
  if (
    completeUpdate.scheduled_at !== null &&
    completeUpdate.started_at !== null &&
    completeUpdate.completed_at !== null
  ) {
    const scheduledDate = new Date(completeUpdate.scheduled_at);
    const startedDate = new Date(completeUpdate.started_at);
    const completedDate = new Date(completeUpdate.completed_at);
    TestValidator.predicate(
      "scheduled before started before completed",
      scheduledDate <= startedDate && startedDate <= completedDate,
    );
  }
  // 8. Test failed delivery scenario with error message
  const notification2 =
    await generate_random_community_platform_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          notification_type: "platform_announcements",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          message: RandomGenerator.content({ paragraphs: 2 }),
          priority: "high",
          status: "pending",
          is_broadcast: true,
          action_url: null,
          related_community_id: null,
          related_post_id: null,
          related_comment_id: null,
        } satisfies ICommunityPlatformSystemNotification.ICreate,
      },
    );
  typia.assert(notification2);
  const failedUpdate =
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.patchBySystemnotificationid(
      adminConnection,
      {
        systemNotificationId: notification2.id,
        body: {
          delivery_status: "failed",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          delivered_count: 0,
          failed_count: 100,
          error_message: "Network connectivity issues during broadcast",
        } satisfies ICommunityPlatformSystemNotificationBroadcastDelivery.IUpdate,
      },
    );
  typia.assert(failedUpdate);
  TestValidator.equals("failed status", failedUpdate.delivery_status, "failed");
  TestValidator.equals(
    "error message set",
    failedUpdate.error_message,
    "Network connectivity issues during broadcast",
  );
  TestValidator.equals("all failed", failedUpdate.failed_count, 100);
  TestValidator.equals("none delivered", failedUpdate.delivered_count, 0);
}