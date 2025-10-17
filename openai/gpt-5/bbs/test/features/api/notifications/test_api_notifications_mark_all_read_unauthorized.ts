import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

export async function test_api_notifications_mark_all_read_unauthorized(
  connection: api.IConnection,
) {
  // Prepare an unauthenticated connection without any headers
  // Note: Per SDK rules, create a fresh headers object and do not manipulate it afterwards
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt to mark all notifications as read without authentication
  // Expectation: the call must fail (error thrown). We do not assert specific status codes.
  await TestValidator.error(
    "unauthenticated request should be rejected when marking all notifications as read",
    async () => {
      await api.functional.econDiscuss.member.me.notifications.markAllRead(
        unauthConn,
      );
    },
  );
}
