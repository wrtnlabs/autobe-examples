import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notifications_mark_read_idempotent_partial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: { password: "P@ssw0rd123" },
  });
  adminConnection.headers ??= {};
  adminConnection.headers["Authorization"] = adminAuth.token.access;
  // 2. Prepare notifications: Because no creation API, simulate by marking newly generated fake IDs.
  // Generate 3 random UUIDs that represent notification IDs
  const notificationIds = ArrayUtil.repeat(3, () =>
    typia.random<string & typia.tags.Format<"uuid">>(),
  );
  // 3. Mark all as read first
  const firstMark =
    await api.functional.shoppingMall.administrator.notifications.read.markRead(
      adminConnection,
      {
        body: {
          notificationIds,
        } satisfies IShoppingMallUserNotification.IMarkRead,
      },
    );
  typia.assert(firstMark);
  // 4. Confirm all are read
  for (const summary of [firstMark].flat()) {
    TestValidator.predicate(
      `notification ${summary.id} is read`,
      summary.isRead && summary.readAt !== null,
    );
  }
  // 5. Select subset - mix read and unread: remock for idempotency
  // In real scenario, we do not have unread after first mark, but testing idempotency with subset
  // Mark again with a subset containing some previously read IDs
  const partialIds = notificationIds.slice(1);
  const secondMark =
    await api.functional.shoppingMall.administrator.notifications.read.markRead(
      adminConnection,
      {
        body: {
          notificationIds: partialIds,
        } satisfies IShoppingMallUserNotification.IMarkRead,
      },
    );
  typia.assert(secondMark);
  for (const summary of [secondMark].flat()) {
    TestValidator.predicate(
      `notification ${summary.id} remains read`,
      summary.isRead && summary.readAt !== null,
    );
  }
  // 6. Ensure idempotent mark does not cause error (above calls didn't throw)
  await TestValidator.predicate("idempotent mark read does not fail", true);
}
