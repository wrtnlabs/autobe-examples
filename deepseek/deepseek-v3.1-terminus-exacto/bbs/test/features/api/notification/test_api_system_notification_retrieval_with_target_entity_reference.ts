import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_notifications_create } from "../../../generate/generate_random_discussion_board_super_admin_system_notifications_create";
import { prepare_random_discussion_board_system_notification } from "../../../prepare/prepare_random_discussion_board_system_notification";

/**
 * Test system notification retrieval with target entity references.
 * 1. Authenticate as super admin
 * 2. Create notification with target entity references
 * 3. Retrieve notification and validate target entity fields
 * 4. Test null handling for optional fields
 */
export async function test_api_system_notification_retrieval_with_target_entity_reference(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin using SDK (utility function not available)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authResult);
  // Update connection with authorization token
  superAdminConnection.headers = {
    Authorization: authResult.token.access,
  };
  // 2. Create notification with target entity references using SDK
  const targetEntityId = typia.random<string & tags.Format<"uuid">>();
  const notificationWithTarget =
    await api.functional.discussionBoard.superAdmin.system_notifications.create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          notification_type: "announcement",
          status: "sent",
          priority: "normal",
          target_entity_type: "user",
          target_entity_id: targetEntityId,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notificationWithTarget);
  // 3. Retrieve and validate notification with target entity references
  const retrievedNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.at(
      superAdminConnection,
      {
        notificationId: notificationWithTarget.id,
      },
    );
  typia.assert(retrievedNotification);
  // Validate target entity fields
  TestValidator.equals(
    "notification ID matches",
    retrievedNotification.id,
    notificationWithTarget.id,
  );
  TestValidator.equals(
    "target entity type",
    retrievedNotification.target_entity_type,
    "user",
  );
  TestValidator.equals(
    "target entity ID",
    retrievedNotification.target_entity_id,
    targetEntityId,
  );
  TestValidator.predicate("has title", retrievedNotification.title.length > 0);
  TestValidator.predicate(
    "has content",
    retrievedNotification.content.length > 0,
  );
  TestValidator.predicate(
    "notification type valid",
    [
      "announcement",
      "alert",
      "status_update",
      "moderation_action",
      "personal_message",
    ].includes(retrievedNotification.notification_type),
  );
  TestValidator.predicate(
    "status valid",
    ["pending", "sent", "read", "archived"].includes(
      retrievedNotification.status,
    ),
  );
  TestValidator.predicate(
    "priority valid",
    ["low", "normal", "high", "critical"].includes(
      retrievedNotification.priority,
    ),
  );
  // 4. Test null handling for optional fields
  const notificationWithoutTarget =
    await api.functional.discussionBoard.superAdmin.system_notifications.create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          notification_type: "alert",
          status: "pending",
          priority: "high",
          target_entity_type: null,
          target_entity_id: null,
          expires_at: null,
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notificationWithoutTarget);
  const retrievedNotification2 =
    await api.functional.discussionBoard.superAdmin.system_notifications.at(
      superAdminConnection,
      {
        notificationId: notificationWithoutTarget.id,
      },
    );
  typia.assert(retrievedNotification2);
  // Validate null handling
  TestValidator.equals(
    "target entity type null",
    retrievedNotification2.target_entity_type,
    null,
  );
  TestValidator.equals(
    "target entity ID null",
    retrievedNotification2.target_entity_id,
    null,
  );
  TestValidator.equals(
    "expires_at null",
    retrievedNotification2.expires_at,
    null,
  );
  // Validate timestamp fields are properly populated
  TestValidator.predicate(
    "delivered_at is null or valid date",
    retrievedNotification2.delivered_at === null ||
      !isNaN(Date.parse(retrievedNotification2.delivered_at)),
  );
  TestValidator.predicate(
    "read_at is null or valid date",
    retrievedNotification2.read_at === null ||
      !isNaN(Date.parse(retrievedNotification2.read_at)),
  );
}
