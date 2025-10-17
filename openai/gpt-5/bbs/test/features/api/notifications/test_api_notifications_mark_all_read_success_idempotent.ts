import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Mark-all-read succeeds and is idempotent for authenticated member.
 *
 * Flow:
 *
 * 1. Join as a new member (issuing tokens via SDK-managed Authorization)
 * 2. POST /econDiscuss/member/me/notifications/markAllRead (should succeed)
 * 3. Call the same endpoint again immediately (should still succeed, idempotent)
 *
 * Business validations:
 *
 * - If the join response contains a subject snapshot, its id should equal the
 *   top-level authorized id.
 * - Both markAllRead calls must complete without throwing errors.
 */
export async function test_api_notifications_mark_all_read_success_idempotent(
  connection: api.IConnection,
) {
  // 1) Register and authenticate a new member – SDK will set Authorization header
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!", // >= 8 chars to satisfy MinLength<8>
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // Optional identity consistency check
  if (authorized.member !== undefined) {
    typia.assertGuard(authorized.member!);
    TestValidator.equals(
      "subject id equals authorized id when member provided",
      authorized.member.id,
      authorized.id,
    );
  }

  // 2) Mark all notifications as read
  await api.functional.econDiscuss.member.me.notifications.markAllRead(
    connection,
  );

  // 3) Call again to confirm idempotency (should still succeed)
  await api.functional.econDiscuss.member.me.notifications.markAllRead(
    connection,
  );
}
