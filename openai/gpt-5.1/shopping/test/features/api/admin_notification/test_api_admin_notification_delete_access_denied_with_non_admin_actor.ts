import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminNotification";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Verify that non-admin actors cannot delete admin notifications.
 *
 * Business goal:
 *
 * - Ensure that the DELETE
 *   /shoppingMall/admin/adminNotifications/{adminNotificationId} endpoint is
 *   protected so that only admin actors (with admin JWT) can delete
 *   notifications. A customer (non-admin) must receive an authorization error
 *   when attempting the same operation.
 *
 * High-level flow:
 *
 * 1. Register an admin using POST /auth/admin/join and obtain an admin token.
 * 2. As that admin, create an admin notification using POST
 *    /shoppingMall/admin/adminNotifications.
 * 3. Register a customer using POST /auth/customer/join, which overwrites the
 *    Authorization header with a customer token.
 * 4. Attempt to delete the previously created admin notification using the
 *    customer token and assert that the operation fails with HTTP 403.
 *
 * Notes:
 *
 * - We cannot re-authenticate as the original admin using a login endpoint,
 *   because only the join endpoints are provided in the SDK. Therefore, we do
 *   not re-verify the notification’s existence after the failed delete; the
 *   core contract under test is the 403 error for non-admin actors.
 */
export async function test_api_admin_notification_delete_access_denied_with_non_admin_actor(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an admin token.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an admin notification as the admin.
  const notificationCreateBody = {
    shopping_mall_admin_id: adminAuthorized.id,
    type: "governance_task",
    title: "Test notification for delete access control",
    status: "unread",
  } satisfies IShoppingMallAdminNotification.ICreate;

  const createdNotification: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: notificationCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(createdNotification);

  // 3. Register a customer; this switches the connection to a customer token.
  const customerJoinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 4. Attempt to delete the admin notification as a customer, expecting 403.
  await TestValidator.httpError(
    "customer cannot delete admin adminNotification via admin erase endpoint",
    403,
    async () => {
      await api.functional.shoppingMall.admin.adminNotifications.erase(
        connection,
        {
          adminNotificationId: createdNotification.id,
        },
      );
    },
  );
}
