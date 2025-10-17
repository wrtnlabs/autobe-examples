import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussNotification";

/**
 * Attempt to update read state for a non-existent notification should fail.
 *
 * Business purpose:
 *
 * - Ensure that the member notifications update endpoint does not leak or mutate
 *   state when a client provides an unknown notification UUID.
 * - Validates protected access with an authenticated member and that missing
 *   resources are rejected without asserting specific HTTP codes.
 *
 * Test flow:
 *
 * 1. Register a new member via join (SDK will set Authorization automatically).
 * 2. Invoke PUT /econDiscuss/member/me/notifications/{notificationId} with a
 *    random, non-existent UUID and body { isRead: true } and assert error.
 * 3. Repeat the call with isRead: false using another random UUID to ensure the
 *    behavior is consistent.
 */
export async function test_api_notification_read_state_update_not_found(
  connection: api.IConnection,
) {
  // 1) Register a new member (authentication context)
  const auth = await api.functional.auth.member.join(connection, {
    body: typia.random<IEconDiscussMember.ICreate>(),
  });
  typia.assert(auth);

  // 2) Attempt to mark read on a non-existent notification (expect error)
  await TestValidator.error(
    "update read state with unknown notificationId (isRead=true) should be rejected",
    async () => {
      await api.functional.econDiscuss.member.me.notifications.update(
        connection,
        {
          notificationId: typia.random<string & tags.Format<"uuid">>(),
          body: { isRead: true } satisfies IEconDiscussNotification.IUpdate,
        },
      );
    },
  );

  // 3) Attempt to mark unread on another non-existent notification (expect error)
  await TestValidator.error(
    "update read state with unknown notificationId (isRead=false) should be rejected",
    async () => {
      await api.functional.econDiscuss.member.me.notifications.update(
        connection,
        {
          notificationId: typia.random<string & tags.Format<"uuid">>(),
          body: { isRead: false } satisfies IEconDiscussNotification.IUpdate,
        },
      );
    },
  );
}
