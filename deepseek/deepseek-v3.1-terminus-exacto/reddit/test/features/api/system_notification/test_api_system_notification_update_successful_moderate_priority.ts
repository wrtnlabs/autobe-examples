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

export async function test_api_system_notification_update_successful_moderate_priority(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    },
  });
  typia.assert(admin);
  // Create initial system notification
  const initialNotification =
    await generate_random_community_platform_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          notification_type: "moderation_actions",
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
  typia.assert(initialNotification);
  // Update notification with higher priority
  const updateData: ICommunityPlatformSystemNotification.IUpdate = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    message: RandomGenerator.content({ paragraphs: 1 }),
    priority: "high",
  };
  const updatedNotification =
    await api.functional.communityPlatform.admin.system_notifications.update(
      adminConnection,
      {
        systemNotificationId: initialNotification.id,
        body: updateData,
      },
    );
  typia.assert(updatedNotification);
  // Validate update was successful
  TestValidator.equals(
    "notification ID unchanged",
    updatedNotification.id,
    initialNotification.id,
  );
  TestValidator.equals(
    "notification type unchanged",
    updatedNotification.notification_type,
    initialNotification.notification_type,
  );
  TestValidator.equals(
    "status unchanged",
    updatedNotification.status,
    initialNotification.status,
  );
  TestValidator.equals(
    "is_broadcast unchanged",
    updatedNotification.is_broadcast,
    initialNotification.is_broadcast,
  );
  TestValidator.equals(
    "related community unchanged",
    updatedNotification.related_community_id,
    initialNotification.related_community_id,
  );
  TestValidator.equals(
    "related post unchanged",
    updatedNotification.related_post_id,
    initialNotification.related_post_id,
  );
  TestValidator.equals(
    "related comment unchanged",
    updatedNotification.related_comment_id,
    initialNotification.related_comment_id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedNotification.created_at,
    initialNotification.created_at,
  );
  TestValidator.equals(
    "processed_at remains null",
    updatedNotification.processed_at,
    null,
  );
  // Validate updated fields
  TestValidator.equals(
    "title updated",
    updatedNotification.title,
    updateData.title,
  );
  TestValidator.equals(
    "message updated",
    updatedNotification.message,
    updateData.message,
  );
  TestValidator.equals(
    "priority updated to high",
    updatedNotification.priority,
    "high",
  );
}
