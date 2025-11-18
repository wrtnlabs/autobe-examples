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
 * Archive a previously handled admin notification while preserving its audit
 * history.
 *
 * Business goal
 *
 * - Verify that an authenticated admin can transition a notification that was
 *   already marked as handled (status "read" with read_at set) into an archived
 *   state using PUT
 *   /shoppingMall/admin/adminNotifications/{adminNotificationId}.
 * - Confirm that this archival correctly updates lifecycle fields (status,
 *   archived_at, updated_at) without breaking core associations or mutating
 *   immutable properties such as id and created_at.
 *
 * Test flow
 *
 * 1. Admin join & authentication
 *
 *    - Call POST /auth/admin/join with a random but valid
 *         IShoppingMallAdminJoin.ICreate payload, using typia.random to satisfy
 *         all format tags.
 *    - Capture the returned IShoppingMallAdmin.IAuthorized and assert it with
 *         typia.assert to guarantee correct shape.
 *    - The join function automatically installs the access token into
 *         connection.headers, so subsequent calls run as this admin.
 * 2. Create a handled (read) notification
 *
 *    - Prepare a base notification creation payload using
 *         typia.random<IShoppingMallAdminNotification.ICreate>().
 *    - Override key fields to match the business scenario:
 *
 *         - Shopping_mall_admin_id := authorizedAdmin.id (the just-joined admin).
 *         - Status := "read" (indicating it has already been processed in the UI).
 *         - Read_at := a concrete current timestamp (new Date().toISOString()).
 *         - Archived_at := null (not yet archived).
 *    - POST /shoppingMall/admin/adminNotifications with this payload.
 *    - Assert the response is a valid IShoppingMallAdminNotification via
 *         typia.assert.
 *    - Store the returned notification as originalNotification for comparison.
 * 3. Archive the notification via update
 *
 *    - Build an IShoppingMallAdminNotification.IUpdate body that only touches
 *         lifecycle fields relevant to archiving:
 *
 *         - Status := "archived".
 *         - Archived_at := new Date().toISOString().
 *         - Omit other optional fields (title, body, entity_*, priority, read_at) so the
 *                   backend keeps their previous values.
 *    - Call PUT /shoppingMall/admin/adminNotifications/{adminNotificationId} using
 *         api.functional.shoppingMall.admin.adminNotifications.update with:
 *
 *         - AdminNotificationId := originalNotification.id.
 *         - Body := the update payload.
 *    - Assert the response with typia.assert to validate DTO integrity.
 * 4. Business assertions on the updated notification
 *
 *    - Id & admin ownership invariants
 *
 *         - Notification.id remains equal to originalNotification.id.
 *         - Notification.admin?.id (if present) equals original admin id.
 *    - Lifecycle field transitions
 *
 *         - Status is exactly "archived".
 *         - Archived_at is non-null and different from originalNotification.archived_at
 *                   (which was null by construction).
 *         - Read_at remains defined and equal to originalNotification.read_at.
 *    - Audit timestamps
 *
 *         - Created_at remains unchanged between original and updated notification.
 *         - Updated_at is different from created_at.
 *         - Optionally verify updated_at is chronologically on/after created_at via a
 *                   Date comparison.
 *    - Content stability
 *
 *         - Type, title, body, priority, and entity_* fields are unchanged compared to
 *                   the originalNotification, since they were not part of the
 *                   IUpdate payload.
 * 5. Summary
 *
 *    - This test ensures that the archive action is modeled as a lifecycle update on
 *         the notification entity (status + archived_at + updated_at) and not
 *         as a destructive delete. It also verifies that read-related metadata
 *         and entity associations remain intact, preserving a clean audit trail
 *         for governance and risk teams.
 */
export async function test_api_admin_notification_archive_after_handling(
  connection: api.IConnection,
) {
  // 1. Join as an admin and obtain authorized context
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a notification already marked as handled (read)
  const baseCreate = typia.random<IShoppingMallAdminNotification.ICreate>();
  const handledNotificationCreateBody = {
    ...baseCreate,
    shopping_mall_admin_id: authorized.id,
    status: "read",
    read_at: new Date().toISOString(),
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const originalNotification: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: handledNotificationCreateBody,
      },
    );
  typia.assert(originalNotification);

  // 3. Archive the notification via update
  const archiveTimestamp = new Date().toISOString();
  const updateBody = {
    status: "archived",
    archived_at: archiveTimestamp,
  } satisfies IShoppingMallAdminNotification.IUpdate;

  const updated: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.update(
      connection,
      {
        adminNotificationId: originalNotification.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Assertions: identity and ownership invariants
  TestValidator.equals(
    "notification id should remain stable across update",
    updated.id,
    originalNotification.id,
  );

  if (updated.admin !== undefined && updated.admin !== null) {
    TestValidator.equals(
      "admin summary id should match authorized admin id when present",
      updated.admin.id,
      authorized.id,
    );
  }

  // 5. Lifecycle transitions
  TestValidator.equals(
    "notification status updated to archived",
    updated.status,
    "archived",
  );

  TestValidator.predicate(
    "archived_at should be set after archival",
    updated.archived_at !== null && updated.archived_at !== undefined,
  );

  TestValidator.notEquals(
    "archived_at should differ from original (previously null)",
    updated.archived_at,
    originalNotification.archived_at ?? null,
  );

  if (originalNotification.read_at !== undefined) {
    TestValidator.equals(
      "read_at should be preserved after archival",
      updated.read_at ?? null,
      originalNotification.read_at,
    );
  }

  // 6. Audit timestamps
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updated.created_at,
    originalNotification.created_at,
  );

  TestValidator.notEquals(
    "updated_at should change after update",
    updated.updated_at,
    originalNotification.updated_at,
  );

  TestValidator.predicate("updated_at should be on or after created_at", () => {
    const created = new Date(updated.created_at).getTime();
    const updatedTime = new Date(updated.updated_at).getTime();
    return updatedTime >= created;
  });

  // 7. Content stability for non-lifecycle fields
  TestValidator.equals(
    "type should remain unchanged after archival",
    updated.type,
    originalNotification.type,
  );

  TestValidator.equals(
    "title should remain unchanged after archival",
    updated.title,
    originalNotification.title,
  );

  TestValidator.equals(
    "body should remain unchanged after archival",
    updated.body ?? null,
    originalNotification.body ?? null,
  );

  TestValidator.equals(
    "priority should remain unchanged after archival",
    updated.priority ?? null,
    originalNotification.priority ?? null,
  );

  TestValidator.equals(
    "entity_type should remain unchanged after archival",
    updated.entity_type ?? null,
    originalNotification.entity_type ?? null,
  );

  TestValidator.equals(
    "entity_id should remain unchanged after archival",
    updated.entity_id ?? null,
    originalNotification.entity_id ?? null,
  );

  TestValidator.equals(
    "entity_display should remain unchanged after archival",
    updated.entity_display ?? null,
    originalNotification.entity_display ?? null,
  );
}
