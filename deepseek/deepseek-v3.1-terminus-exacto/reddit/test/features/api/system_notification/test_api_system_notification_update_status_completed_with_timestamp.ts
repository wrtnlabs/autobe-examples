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

export async function test_api_system_notification_update_status_completed_with_timestamp(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account for authentication
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
  // Create initial system notification with 'pending' status
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
          is_broadcast: false,
          action_url: null,
          related_community_id: null,
          related_post_id: null,
          related_comment_id: null,
        } satisfies ICommunityPlatformSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // Verify initial state: status is 'pending' and processed_at is null
  TestValidator.equals(
    "initial status is pending",
    notification.status,
    "pending",
  );
  TestValidator.equals(
    "initial processed_at is null",
    notification.processed_at,
    null,
  );
  // Update notification status to 'completed'
  const updateBody = {
    status: "completed",
  } satisfies ICommunityPlatformSystemNotification.IUpdate;
  const updatedNotification =
    await api.functional.communityPlatform.admin.system_notifications.update(
      adminConnection,
      {
        systemNotificationId: notification.id,
        body: updateBody,
      },
    );
  typia.assert(updatedNotification);
  // Validate that status changed to 'completed'
  TestValidator.equals(
    "status updated to completed",
    updatedNotification.status,
    "completed",
  );
  // Validate that processed_at timestamp is now set (not null)
  TestValidator.notEquals(
    "processed_at timestamp is set",
    updatedNotification.processed_at,
    null,
  );
  TestValidator.predicate(
    "processed_at is valid date string",
    typeof updatedNotification.processed_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        updatedNotification.processed_at!,
      ),
  );
  // Validate that all other fields remain intact
  TestValidator.equals(
    "id remains same",
    updatedNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "notification_type remains same",
    updatedNotification.notification_type,
    notification.notification_type,
  );
  TestValidator.equals(
    "title remains same",
    updatedNotification.title,
    notification.title,
  );
  TestValidator.equals(
    "message remains same",
    updatedNotification.message,
    notification.message,
  );
  TestValidator.equals(
    "priority remains same",
    updatedNotification.priority,
    notification.priority,
  );
  TestValidator.equals(
    "is_broadcast remains same",
    updatedNotification.is_broadcast,
    notification.is_broadcast,
  );
  TestValidator.equals(
    "action_url remains same",
    updatedNotification.action_url,
    notification.action_url,
  );
  TestValidator.equals(
    "related_community_id remains same",
    updatedNotification.related_community_id,
    notification.related_community_id,
  );
  TestValidator.equals(
    "related_post_id remains same",
    updatedNotification.related_post_id,
    notification.related_post_id,
  );
  TestValidator.equals(
    "related_comment_id remains same",
    updatedNotification.related_comment_id,
    notification.related_comment_id,
  );
  TestValidator.equals(
    "created_at remains same",
    updatedNotification.created_at,
    notification.created_at,
  );
}
