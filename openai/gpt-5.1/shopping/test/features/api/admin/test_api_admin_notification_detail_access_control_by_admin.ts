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
 * Validate per-admin access control for admin notification detail endpoint.
 *
 * Business goal:
 *
 * - Ensure that an admin can see their own notifications via the detail endpoint.
 * - Ensure that a different admin cannot retrieve another admin's notification
 *   detail.
 * - Verify that each admin can retrieve notifications explicitly targeted to
 *   them, confirming isolation by admin owner.
 *
 * Scenario steps:
 *
 * 1. Join as Admin A (unauthenticated -> admin A session established).
 * 2. While authenticated as Admin A, create a notification targeting Admin A.
 * 3. Fetch the notification detail as Admin A and validate correctness.
 * 4. Join as Admin B (switch authentication context to Admin B).
 * 5. As Admin B, attempt to fetch Admin A's notification detail and expect an
 *    error (authorization or not-found).
 * 6. As Admin B, create a notification targeting Admin B.
 * 7. As Admin B, fetch their own notification detail and validate correctness.
 * 8. Optionally, re-join as Admin A and verify that Admin A cannot fetch Admin B's
 *    notification detail, ensuring symmetric isolation.
 */
export async function test_api_admin_notification_detail_access_control_by_admin(
  connection: api.IConnection,
) {
  // 1. Join as Admin A
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminAAuth);

  const adminAId: string & tags.Format<"uuid"> = adminAAuth.id;

  // 2. While authenticated as Admin A, create a notification for Admin A
  const adminANotificationCreateBody = {
    shopping_mall_admin_id: adminAId,
    related_risk_case_id: null,
    related_legal_hold_id: null,
    type: "test_admin_a_notification",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 5 }),
    status: "unread",
    priority: "high",
    entity_type: "test_entity_type_a",
    entity_id: null,
    entity_display: "Admin A test notification entity",
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const adminANotification: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: adminANotificationCreateBody,
      },
    );
  typia.assert(adminANotification);

  const adminANotificationId: string & tags.Format<"uuid"> =
    adminANotification.id;

  // 3. As Admin A, fetch the notification detail and validate
  const adminANotificationDetail: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.at(connection, {
      adminNotificationId: adminANotificationId,
    });
  typia.assert(adminANotificationDetail);

  TestValidator.equals(
    "Admin A should retrieve own notification by id",
    adminANotificationDetail.id,
    adminANotificationId,
  );

  TestValidator.equals(
    "Admin A notification type should match created value",
    adminANotificationDetail.type,
    adminANotificationCreateBody.type,
  );

  TestValidator.equals(
    "Admin A notification title should match created value",
    adminANotificationDetail.title,
    adminANotificationCreateBody.title,
  );

  TestValidator.equals(
    "Admin A notification status should match created value",
    adminANotificationDetail.status,
    adminANotificationCreateBody.status,
  );

  if (adminANotificationDetail.admin !== undefined) {
    TestValidator.equals(
      "Admin A notification admin summary id should match Admin A id when present",
      adminANotificationDetail.admin.id,
      adminAId,
    );
  }

  // 4. Join as Admin B (switch context)
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminBAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminBAuth);

  const adminBId: string & tags.Format<"uuid"> = adminBAuth.id;

  // 5. As Admin B, trying to access Admin A's notification detail must fail
  await TestValidator.error(
    "Admin B must not be able to access Admin A's notification detail",
    async () => {
      await api.functional.shoppingMall.admin.adminNotifications.at(
        connection,
        {
          adminNotificationId: adminANotificationId,
        },
      );
    },
  );

  // 6. As Admin B, create a notification for Admin B
  const adminBNotificationCreateBody = {
    shopping_mall_admin_id: adminBId,
    related_risk_case_id: null,
    related_legal_hold_id: null,
    type: "test_admin_b_notification",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 4 }),
    status: "unread",
    priority: "normal",
    entity_type: "test_entity_type_b",
    entity_id: null,
    entity_display: "Admin B test notification entity",
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const adminBNotification: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: adminBNotificationCreateBody,
      },
    );
  typia.assert(adminBNotification);

  const adminBNotificationId: string & tags.Format<"uuid"> =
    adminBNotification.id;

  // 7. As Admin B, fetch their own notification detail and validate
  const adminBNotificationDetail: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.at(connection, {
      adminNotificationId: adminBNotificationId,
    });
  typia.assert(adminBNotificationDetail);

  TestValidator.equals(
    "Admin B should retrieve own notification by id",
    adminBNotificationDetail.id,
    adminBNotificationId,
  );

  TestValidator.equals(
    "Admin B notification type should match created value",
    adminBNotificationDetail.type,
    adminBNotificationCreateBody.type,
  );

  TestValidator.equals(
    "Admin B notification title should match created value",
    adminBNotificationDetail.title,
    adminBNotificationCreateBody.title,
  );

  TestValidator.equals(
    "Admin B notification status should match created value",
    adminBNotificationDetail.status,
    adminBNotificationCreateBody.status,
  );

  if (adminBNotificationDetail.admin !== undefined) {
    TestValidator.equals(
      "Admin B notification admin summary id should match Admin B id when present",
      adminBNotificationDetail.admin.id,
      adminBId,
    );
  }

  // 8. Optionally, re-join as Admin A and verify cannot access Admin B's notification
  const adminARejoinAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminARejoinAuth);

  await TestValidator.error(
    "Admin A must not be able to access Admin B's notification detail",
    async () => {
      await api.functional.shoppingMall.admin.adminNotifications.at(
        connection,
        {
          adminNotificationId: adminBNotificationId,
        },
      );
    },
  );
}
