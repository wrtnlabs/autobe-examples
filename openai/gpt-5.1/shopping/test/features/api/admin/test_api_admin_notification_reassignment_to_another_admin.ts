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
 * Validate reassignment of an admin notification from one admin to another.
 *
 * ## Business context
 *
 * In the governance/operations console, administrators receive notifications
 * representing tasks, alerts, or case-related messages. Ownership of a
 * notification is driven by the `shopping_mall_admin_id` foreign key, which is
 * projected to clients as the `admin` summary on
 * IShoppingMallAdminNotification. In practice, governance operators often need
 * to hand off these notifications from one admin to another (for example,
 * workload balancing or role-based escalation). The PUT
 * /shoppingMall/admin/adminNotifications/{adminNotificationId} endpoint, with
 * IShoppingMallAdminNotification.IUpdate, is the mechanism that should support
 * such reassignment.
 *
 * This test ensures that:
 *
 * - An authenticated admin (Admin B) can create a notification initially assigned
 *   to another admin (Admin A).
 * - The same authenticated admin can later update the notification so that its
 *   ownership is reassigned to themselves by changing only
 *   `shopping_mall_admin_id` in the update payload.
 * - The API preserves other notification fields (type, title, status, timestamps)
 *   during this partial update while updating the `admin` summary linkage and
 *   `updated_at` timestamp appropriately.
 *
 * ## High-level flow
 *
 * 1. Create Admin A via POST /auth/admin/join.
 *
 *    - Capture Admin A's UUID (from authorized.admin.id if present, otherwise from
 *         top-level id).
 * 2. Create Admin B via POST /auth/admin/join.
 *
 *    - Capture Admin B's UUID similarly.
 *    - After this call, the SDK sets the Authorization header to Admin B's access
 *         token so all subsequent calls run as Admin B.
 * 3. As Admin B, create a notification targeting Admin A via POST
 *    /shoppingMall/admin/adminNotifications.
 *
 *    - Use IShoppingMallAdminNotification.ICreate with minimal, valid fields:
 *
 *         - Shopping_mall_admin_id = Admin A id
 *         - Type, title, status as simple strings
 *         - Optional fields left undefined
 *    - Capture the returned notification as `created`.
 * 4. Reassign the notification via PUT
 *    /shoppingMall/admin/adminNotifications/{id}.
 *
 *    - Call api.functional.shoppingMall.admin.adminNotifications.update with:
 *
 *         - AdminNotificationId = created.id
 *         - Body: IShoppingMallAdminNotification.IUpdate containing only
 *                   shopping_mall_admin_id = Admin B id
 *    - Capture the returned notification as `updated`.
 * 5. Validate reassignment semantics:
 *
 *    - Id is unchanged.
 *    - Created.admin is defined and created.admin.id equals Admin A id.
 *    - Updated.admin is defined and updated.admin.id equals Admin B id.
 *    - Created.type === updated.type.
 *    - Created.title === updated.title.
 *    - Created.status === updated.status.
 *    - Created.created_at === updated.created_at.
 *    - Updated.updated_at is different from created.updated_at, and updated
 *         updated_at is not earlier than created_at.
 * 6. Negative-path sanity check (optional but recommended):
 *
 *    - Call update with a syntactically valid but non-existent adminNotificationId
 *         and a minimal valid IUpdate body.
 *    - Wrap in TestValidator.error to ensure the endpoint rejects invalid targets at
 *         runtime without creating type-level violations.
 */
export async function test_api_admin_notification_reassignment_to_another_admin(
  connection: api.IConnection,
) {
  // 1. Create Admin A (original owner)
  const adminABody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: undefined,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminA = await api.functional.auth.admin.join(connection, {
    body: adminABody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminA);

  const adminAId: string & tags.Format<"uuid"> = adminA.admin
    ? adminA.admin.id
    : adminA.id;

  // 2. Create Admin B (operator and new owner)
  const adminBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: undefined,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminB = await api.functional.auth.admin.join(connection, {
    body: adminBBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminB);

  const adminBId: string & tags.Format<"uuid"> = adminB.admin
    ? adminB.admin.id
    : adminB.id;

  // 3. As Admin B (current token), create a notification assigned to Admin A
  const createBody = {
    shopping_mall_admin_id: adminAId,
    type: "workload_assignment",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: null,
    status: "unread",
    priority: null,
    related_risk_case_id: null,
    related_legal_hold_id: null,
    entity_type: null,
    entity_id: null,
    entity_display: null,
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const created: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallAdminNotification>(created);

  // Sanity: created admin summary should point to Admin A.
  TestValidator.equals(
    "created notification is assigned to Admin A",
    created.admin?.id ?? null,
    adminAId,
  );

  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // 4. Reassign notification to Admin B via update (changing only shopping_mall_admin_id)
  const updateBody = {
    shopping_mall_admin_id: adminBId,
  } satisfies IShoppingMallAdminNotification.IUpdate;

  const updated: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.update(
      connection,
      {
        adminNotificationId: created.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(updated);

  // 5. Validate reassignment semantics
  TestValidator.equals(
    "notification id remains stable after reassignment",
    updated.id,
    created.id,
  );

  TestValidator.equals(
    "created notification linked to Admin A before reassignment",
    created.admin?.id ?? null,
    adminAId,
  );

  TestValidator.equals(
    "updated notification linked to Admin B after reassignment",
    updated.admin?.id ?? null,
    adminBId,
  );

  TestValidator.equals(
    "type remains unchanged after reassignment",
    updated.type,
    created.type,
  );

  TestValidator.equals(
    "title remains unchanged after reassignment",
    updated.title,
    created.title,
  );

  TestValidator.equals(
    "status remains unchanged after reassignment",
    updated.status,
    created.status,
  );

  TestValidator.equals(
    "created_at remains unchanged after reassignment",
    updated.created_at,
    originalCreatedAt,
  );

  TestValidator.notEquals(
    "updated_at should change after reassignment",
    updated.updated_at,
    originalUpdatedAt,
  );

  const createdAtDate = new Date(originalCreatedAt);
  const updatedAtDate = new Date(updated.updated_at);
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    updatedAtDate.getTime() >= createdAtDate.getTime(),
  );

  // 6. Negative-path sanity check: updating a non-existent notification id
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "updating non-existent notification should fail",
    async () => {
      await api.functional.shoppingMall.admin.adminNotifications.update(
        connection,
        {
          adminNotificationId: nonExistentId,
          body: {
            shopping_mall_admin_id: adminBId,
          } satisfies IShoppingMallAdminNotification.IUpdate,
        },
      );
    },
  );
}
