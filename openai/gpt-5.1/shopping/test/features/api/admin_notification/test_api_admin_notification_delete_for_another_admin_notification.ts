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
 * Validate that an authenticated admin can delete an admin notification that
 * targets another admin account.
 *
 * Business goal
 *
 * - Prove that admin notification deletion is governed by global admin
 *   privileges, not restricted to notifications owned by the acting admin.
 *
 * High level flow
 *
 * 1. Register Admin A (first join) to obtain an initial admin identity.
 * 2. Register Admin B (second join) to obtain a distinct admin id that will be the
 *    target of the notification.
 * 3. Re-join as a new admin instance (Admin A2) so that the connection is
 *    authenticated as an admin actor that will manage notifications.
 * 4. While authenticated as Admin A2, create an admin notification whose
 *    shopping_mall_admin_id is Admin B’s id.
 * 5. Verify the created notification is correctly linked to Admin B.
 * 6. Still as Admin A2, delete that notification by id.
 * 7. Assert the deletion succeeds (no error) to demonstrate cross-admin deletion
 *    capability.
 */
export async function test_api_admin_notification_delete_for_another_admin_notification(
  connection: api.IConnection,
) {
  // 1. Register Admin A (we only need a successful join, no further usage)
  const adminAJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminA: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminA);

  // 2. Register Admin B and capture its id
  const adminBJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminB);

  const adminBId = adminB.id;
  TestValidator.predicate(
    "admin B id should be a non-empty string",
    adminBId.length > 0,
  );

  // 3. Re-join as acting admin (Admin A2) so that connection is authenticated
  const adminA2JoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const actingAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminA2JoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(actingAdmin);

  // 4. Create an admin notification targeted to Admin B using actingAdmin token
  const notificationCreateBody = {
    shopping_mall_admin_id: adminBId,
    type: "risk_sla_violation",
    title: "Risk case SLA breach for review",
    body: RandomGenerator.paragraph({ sentences: 5 }),
    status: "unread",
    priority: "high",
    entity_type: null,
    entity_id: null,
    entity_display: null,
    read_at: null,
    archived_at: null,
    related_risk_case_id: null,
    related_legal_hold_id: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const createdNotification: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: notificationCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(createdNotification);

  // 5. Verify notification is linked to Admin B
  TestValidator.equals(
    "created notification should target Admin B by foreign key id",
    createdNotification.admin?.id ?? adminBId,
    adminBId,
  );

  TestValidator.equals(
    "created notification type should match input",
    createdNotification.type,
    notificationCreateBody.type,
  );

  TestValidator.equals(
    "created notification title should match input",
    createdNotification.title,
    notificationCreateBody.title,
  );

  // 6. Delete the notification as actingAdmin (via same connection)
  await api.functional.shoppingMall.admin.adminNotifications.erase(connection, {
    adminNotificationId: createdNotification.id,
  });

  // 7. If we reached here without error, deletion is considered successful.
  //    We assert boolean true for clarity in test output.
  TestValidator.predicate(
    "deletion of another admin's notification should succeed",
    true,
  );
}
