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

export async function test_api_system_notification_broadcast_delivery_update_status_progress(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin to access system notification endpoints
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create a broadcast system notification that should generate delivery records
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
  // For this test scenario, we assume a delivery record exists after broadcast notification creation
  // In a real scenario, there would be an API to fetch delivery records for a notification
  // Since that API is not provided, we'll simulate having a valid delivery ID
  const deliveryId = typia.random<string & tags.Format<"uuid">>();
  // Update the broadcast delivery status and progress
  const updateBody: ICommunityPlatformSystemNotificationBroadcastDelivery.IUpdate =
    {
      delivery_status: "in_progress",
      delivered_count: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<1000>
      >(),
      failed_count: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<100>
      >(),
      started_at: new Date().toISOString(),
      scheduled_at: null,
      completed_at: null,
      error_message: null,
    };
  const updatedDelivery =
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.putBySystemnotificationidAndDeliveryid(
      adminConnection,
      {
        systemNotificationId: notification.id,
        deliveryId: deliveryId,
        body: updateBody,
      },
    );
  typia.assert(updatedDelivery);
  // Validate the update was successful
  TestValidator.equals(
    "delivery status updated to in_progress",
    updatedDelivery.delivery_status,
    "in_progress",
  );
  TestValidator.equals(
    "delivered count matches input",
    updatedDelivery.delivered_count,
    updateBody.delivered_count!,
  );
  TestValidator.equals(
    "failed count matches input",
    updatedDelivery.failed_count,
    updateBody.failed_count!,
  );
  TestValidator.predicate(
    "started_at timestamp is set",
    updatedDelivery.started_at !== null,
  );
  TestValidator.predicate(
    "completed_at is not set for in_progress status",
    updatedDelivery.completed_at === null,
  );
  TestValidator.predicate(
    "system_notification_id matches",
    updatedDelivery.system_notification_id === notification.id,
  );
  TestValidator.predicate(
    "updated_at is recent",
    new Date(updatedDelivery.updated_at).getTime() > Date.now() - 60000,
  );
  // Validate business logic constraints
  TestValidator.predicate(
    "total recipients is non-negative",
    updatedDelivery.total_recipients >= 0,
  );
  TestValidator.predicate(
    "delivered count is within valid range",
    updatedDelivery.delivered_count <= updatedDelivery.total_recipients,
  );
  TestValidator.predicate(
    "failed count is within valid range",
    updatedDelivery.failed_count <= updatedDelivery.total_recipients,
  );
  TestValidator.predicate(
    "delivered and failed counts don't exceed total",
    updatedDelivery.delivered_count + updatedDelivery.failed_count <=
      updatedDelivery.total_recipients,
  );
}
