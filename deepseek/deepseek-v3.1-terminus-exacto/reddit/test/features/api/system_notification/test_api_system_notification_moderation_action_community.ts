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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_system_notifications_create } from "../../../generate/generate_random_community_platform_admin_system_notifications_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_system_notification } from "../../../prepare/prepare_random_community_platform_system_notification";

/**
 * Test creating a community-specific moderation action notification.
 * This scenario validates targeted notifications with community context.
 */
export async function test_api_system_notification_moderation_action_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdmin.ILogin;
  await authorize_admin_join(adminConnection, {
    body: {
      ...adminCredentials,
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Authenticate admin
  await authorize_admin_login(adminConnection, {
    body: adminCredentials,
  });
  // 2. User setup
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformUser.ILogin;
  await authorize_user_join(userConnection, {
    body: {
      ...userCredentials,
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Authenticate user
  await authorize_user_login(userConnection, {
    body: userCredentials,
  });
  // 3. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create moderation action notification
  const notification =
    await generate_random_community_platform_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          notification_type: "moderation_actions",
          title: RandomGenerator.paragraph({ sentences: 1 }),
          message: RandomGenerator.paragraph({ sentences: 3 }),
          priority: "normal",
          status: "pending",
          is_broadcast: false,
          related_community_id: community.id,
          related_post_id: null,
          related_comment_id: null,
          action_url: null,
        } satisfies ICommunityPlatformSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // 5. Validate notification properties
  TestValidator.equals(
    "notification type",
    notification.notification_type,
    "moderation_actions",
  );
  TestValidator.equals("priority", notification.priority, "normal");
  TestValidator.equals("status", notification.status, "pending");
  TestValidator.equals("is_broadcast", notification.is_broadcast, false);
  TestValidator.equals(
    "related community id",
    notification.related_community_id,
    community.id,
  );
  TestValidator.predicate(
    "has related community object",
    () => notification.relatedCommunity !== null,
  );
  // 6. Validate community context
  if (notification.relatedCommunity) {
    TestValidator.equals(
      "community id matches",
      notification.relatedCommunity.id,
      community.id,
    );
    TestValidator.equals(
      "community name matches",
      notification.relatedCommunity.name,
      community.name,
    );
  }
  // 7. Validate timestamps
  TestValidator.predicate(
    "has creation timestamp",
    () => notification.created_at !== null,
  );
  TestValidator.predicate(
    "processed_at is null for pending status",
    () => notification.processed_at === null,
  );
}
