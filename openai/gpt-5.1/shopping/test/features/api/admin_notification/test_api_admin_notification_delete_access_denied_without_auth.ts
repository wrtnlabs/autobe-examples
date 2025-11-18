import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminNotification";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

export async function test_api_admin_notification_delete_access_denied_without_auth(
  connection: api.IConnection,
) {
  // 1. Seed an admin account via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an admin notification assigned to this admin
  const createNotificationBody = {
    shopping_mall_admin_id: adminAuthorized.id,
    type: "test_notification_type",
    title: "Test notification for unauthenticated delete",
    status: "unread",
  } satisfies IShoppingMallAdminNotification.ICreate;

  const notification: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: createNotificationBody,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(notification);

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4. Attempt to delete the notification without authentication and
  //    verify that it fails.
  await TestValidator.error(
    "unauthenticated adminNotification erase must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.adminNotifications.erase(
        unauthConn,
        {
          adminNotificationId: notification.id,
        },
      );
    },
  );
}
