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

export async function test_api_system_notification_broadcast_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create a broadcast system notification
  const notification =
    await generate_random_community_platform_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          notification_type: "platform_announcements",
          title: "Platform Update",
          message: "New features deployed",
          priority: "high",
          status: "pending",
          is_broadcast: true,
          related_community_id: null,
          related_post_id: null,
          related_comment_id: null,
          action_url: null,
        } satisfies ICommunityPlatformSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // Retrieve the created notification
  const retrievedNotification =
    await api.functional.communityPlatform.admin.system_notifications.at(
      adminConnection,
      {
        systemNotificationId: notification.id,
      },
    );
  typia.assert(retrievedNotification);
  // Validate all expected fields
  TestValidator.equals(
    "notification id matches",
    retrievedNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "notification type",
    retrievedNotification.notification_type,
    "platform_announcements",
  );
  TestValidator.equals("title", retrievedNotification.title, "Platform Update");
  TestValidator.equals(
    "message",
    retrievedNotification.message,
    "New features deployed",
  );
  TestValidator.equals("priority", retrievedNotification.priority, "high");
  TestValidator.equals("status", retrievedNotification.status, "pending");
  TestValidator.equals(
    "is_broadcast",
    retrievedNotification.is_broadcast,
    true,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedNotification.created_at !== undefined,
  );
  // Verify broadcast-specific null values
  TestValidator.equals(
    "related_community_id is null",
    retrievedNotification.related_community_id,
    null,
  );
  TestValidator.equals(
    "related_post_id is null",
    retrievedNotification.related_post_id,
    null,
  );
  TestValidator.equals(
    "related_comment_id is null",
    retrievedNotification.related_comment_id,
    null,
  );
  // Validate optional fields are properly set
  TestValidator.equals(
    "action_url is null",
    retrievedNotification.action_url,
    null,
  );
  TestValidator.equals(
    "processed_at is null",
    retrievedNotification.processed_at,
    null,
  );
  // Validate related objects are null for broadcast notifications
  TestValidator.equals(
    "relatedCommunity is null",
    retrievedNotification.relatedCommunity,
    null,
  );
  TestValidator.equals(
    "relatedPost is null",
    retrievedNotification.relatedPost,
    null,
  );
  TestValidator.equals(
    "relatedComment is null",
    retrievedNotification.relatedComment,
    null,
  );
}
