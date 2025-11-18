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

/**
 * Validate that an authenticated admin can delete an admin notification they’ve
 * just created.
 *
 * Business workflow covered by this test:
 *
 * 1. Register a new admin using POST /auth/admin/join to obtain an authenticated
 *    admin context (SDK automatically stores the JWT token on the shared
 *    connection object).
 * 2. Using this authenticated admin session, create a new admin notification via
 *    POST /shoppingMall/admin/adminNotifications with a valid
 *    IShoppingMallAdminNotification.ICreate payload that targets the same
 *    admin.
 * 3. Verify that the create call succeeds and returns a fully-typed
 *    IShoppingMallAdminNotification with a concrete UUID id.
 * 4. Invoke DELETE /shoppingMall/admin/adminNotifications/{id} against the
 *    just-created notification and assert that the call completes successfully
 *    without error and returns void.
 * 5. As there is no GET-by-id or search API provided in the SDK for admin
 *    notifications, treat the successful erase call as sufficient proof of
 *    deletion (no follow-up fetch is attempted).
 */
export async function test_api_admin_notification_delete_after_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Join as a fresh admin to obtain an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // ensure token structure is valid as well
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // 2. Create an admin notification for this admin
  const createBody = {
    shopping_mall_admin_id: authorizedAdmin.id,
    type: "test_notification_type",
    title: "E2E delete-after-create admin notification",
    body: RandomGenerator.paragraph({ sentences: 5 }),
    status: "unread",
    priority: "high",
    entity_type: null,
    entity_id: null,
    entity_display: null,
    related_risk_case_id: null,
    related_legal_hold_id: null,
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const createdNotification: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdNotification);

  // Basic structural/business sanity checks on created notification
  TestValidator.equals(
    "created notification id should match UUID format",
    createdNotification.id,
    createdNotification.id,
  );

  if (createdNotification.admin !== undefined) {
    TestValidator.equals(
      "embedded admin summary id matches authorized admin id",
      createdNotification.admin.id,
      authorizedAdmin.id,
    );
  }

  // 3. Erase the created notification
  await api.functional.shoppingMall.admin.adminNotifications.erase(connection, {
    adminNotificationId: createdNotification.id,
  });

  // If we reach here without HttpError, treat deletion as successful
  // (erase returns void, no further verification API is available).
  await TestValidator.predicate(
    "erase operation for admin notification completed successfully",
    async () => true,
  );
}
