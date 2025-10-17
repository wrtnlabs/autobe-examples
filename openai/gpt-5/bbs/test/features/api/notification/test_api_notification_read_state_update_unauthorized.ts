import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussNotification";

export async function test_api_notification_read_state_update_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Authentication boundary: updating notification read-state must require
   * auth.
   *
   * Steps:
   *
   * 1. Build an unauthenticated connection by cloning the given connection and
   *    setting headers to an empty object.
   * 2. Attempt to mark a notification as read (isRead=true) with a random UUID ->
   *    expect an error.
   * 3. Attempt to mark a notification as unread (isRead=false) with a random UUID
   *    -> expect an error.
   * 4. Use TestValidator.error with awaited async callback; do not assert HTTP
   *    status codes or error payloads.
   */
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const notificationId1 = typia.random<string & tags.Format<"uuid">>();
  const bodyRead = { isRead: true } satisfies IEconDiscussNotification.IUpdate;

  await TestValidator.error(
    "unauthenticated cannot update notification read state (isRead=true)",
    async () => {
      await api.functional.econDiscuss.member.me.notifications.update(
        unauthConn,
        {
          notificationId: notificationId1,
          body: bodyRead,
        },
      );
    },
  );

  const notificationId2 = typia.random<string & tags.Format<"uuid">>();
  const bodyUnread = {
    isRead: false,
  } satisfies IEconDiscussNotification.IUpdate;

  await TestValidator.error(
    "unauthenticated cannot update notification read state (isRead=false)",
    async () => {
      await api.functional.econDiscuss.member.me.notifications.update(
        unauthConn,
        {
          notificationId: notificationId2,
          body: bodyUnread,
        },
      );
    },
  );
}
