import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_system_notifications_create } from "../../../generate/generate_random_discussion_board_admin_system_notifications_create";
import { prepare_random_discussion_board_system_notification } from "../../../prepare/prepare_random_discussion_board_system_notification";

export async function test_api_system_notification_update_content_appropriateness(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create initial system notification
  const initialNotification =
    await generate_random_discussion_board_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: "Initial notification content for testing purposes",
          notification_type: "announcement",
          status: "pending",
          priority: "normal",
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(initialNotification);
  // 3. Test valid content update (should succeed)
  const validUpdate =
    await api.functional.discussionBoard.admin.system_notifications.update(
      adminConnection,
      {
        notificationId: initialNotification.id,
        body: {
          content: "Updated notification with appropriate community content",
        } satisfies IDiscussionBoardSystemNotification.IUpdate,
      },
    );
  typia.assert(validUpdate);
  TestValidator.equals(
    "valid content update",
    validUpdate.content,
    "Updated notification with appropriate community content",
  );
  // 4. Test partial update functionality
  const partialUpdate =
    await api.functional.discussionBoard.admin.system_notifications.update(
      adminConnection,
      {
        notificationId: initialNotification.id,
        body: {
          title: "Updated Title Only",
          // content field omitted to test partial update
        } satisfies IDiscussionBoardSystemNotification.IUpdate,
      },
    );
  typia.assert(partialUpdate);
  TestValidator.equals(
    "title updated",
    partialUpdate.title,
    "Updated Title Only",
  );
  TestValidator.equals(
    "content preserved",
    partialUpdate.content,
    "Updated notification with appropriate community content",
  );
  // 5. Test priority field update
  const priorityUpdate =
    await api.functional.discussionBoard.admin.system_notifications.update(
      adminConnection,
      {
        notificationId: initialNotification.id,
        body: {
          priority: "high",
        } satisfies IDiscussionBoardSystemNotification.IUpdate,
      },
    );
  typia.assert(priorityUpdate);
  TestValidator.equals("priority updated", priorityUpdate.priority, "high");
}
