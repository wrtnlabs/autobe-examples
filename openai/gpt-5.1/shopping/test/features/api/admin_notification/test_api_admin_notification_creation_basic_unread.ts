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
 * Validate that an authenticated admin can create a minimal, unread admin
 * notification for themselves without linking to any risk case, legal hold, or
 * other entities.
 *
 * Business goal
 *
 * - Ensure basic notification creation works with only the required core fields
 *   (shopping_mall_admin_id, type, title, status) populated.
 * - Confirm that the notification can be created for the currently authenticated
 *   admin and that no related_risk_case_id / related_legal_hold_id / entity_*
 *   fields are required.
 * - Verify default behavior for a fresh unread notification: read_at /
 *   archived_at are null and deleted_at is null.
 *
 * Scenario steps
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authenticated
 *    admin context. The SDK automatically stores the access token in
 *    connection.headers.Authorization, so subsequent admin endpoints are
 *    authorized.
 * 2. Build a minimal IShoppingMallAdminNotification.ICreate payload:
 *
 *    - Shopping_mall_admin_id: the id of the just-created admin.
 *    - Type: constant "generic_info".
 *    - Title: short RandomGenerator-based title string.
 *    - Status: constant "unread".
 *    - Body: omitted (so it is undefined) to represent no extra body text.
 *    - Related_risk_case_id, related_legal_hold_id: omitted so they are undefined.
 *    - Entity_type, entity_id, entity_display: omitted so they are undefined.
 *    - Priority: omitted so it is undefined.
 *    - Read_at, archived_at: omitted so they default to null for a new unread
 *         notification.
 * 3. Call POST /shoppingMall/admin/adminNotifications with that payload.
 * 4. Assert the response using typia.assert to validate it matches
 *    IShoppingMallAdminNotification.
 * 5. Validate key business fields with TestValidator:
 *
 *    - Notification.admin?.id equals the admin id.
 *    - Notification.type equals the requested type ("generic_info").
 *    - Notification.title equals the requested title.
 *    - Notification.status equals "unread".
 *    - Notification.body, priority, entity_type, entity_id, entity_display are
 *         either null or undefined (no hard assertion on null vs undefined,
 *         only that they are not a non-empty unexpected value).
 *    - Notification.read_at and notification.archived_at are null or undefined,
 *         representing an unread, non-archived notification.
 *    - Notification.deleted_at is null or undefined, representing a non-deleted
 *         record.
 *    - Created_at and updated_at are valid ISO date-time strings (implicitly
 *         validated by typia.assert).
 */
export async function test_api_admin_notification_creation_basic_unread(
  connection: api.IConnection,
) {
  // 1. Register a new admin (join) to get an authenticated admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  // Ensure the nested admin summary is present when available
  const adminSummary: IShoppingMallAdmin.ISummary | undefined =
    authorized.admin;
  TestValidator.predicate(
    "authorized admin should have a non-empty id",
    () => typeof authorized.id === "string" && authorized.id.length > 0,
  );

  // 2. Prepare a minimal notification create payload
  const notificationType = "generic_info";
  const notificationTitle = RandomGenerator.paragraph({ sentences: 3 });

  const createBody = {
    shopping_mall_admin_id: authorized.id,
    type: notificationType,
    title: notificationTitle,
    status: "unread",
  } satisfies IShoppingMallAdminNotification.ICreate;

  // 3. Create the admin notification
  const notification: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(notification);

  // 4. Business-level validations on the created notification
  TestValidator.equals(
    "notification type should match request",
    notification.type,
    notificationType,
  );
  TestValidator.equals(
    "notification title should match request",
    notification.title,
    notificationTitle,
  );
  TestValidator.equals(
    "notification status should be unread",
    notification.status,
    "unread",
  );

  // Validate that the notification is assigned to the joining admin
  TestValidator.equals(
    "notification.admin id should match authorized admin id when present",
    notification.admin?.id ?? authorized.id,
    authorized.id,
  );

  // Validate that linkage fields are not populated when omitted
  TestValidator.predicate(
    "related risk case should not be set",
    () =>
      notification.relatedRiskCase === null ||
      notification.relatedRiskCase === undefined,
  );
  TestValidator.predicate(
    "related legal hold should not be set",
    () =>
      notification.relatedLegalHold === null ||
      notification.relatedLegalHold === undefined,
  );

  TestValidator.predicate(
    "entity_type should not be set",
    () =>
      notification.entity_type === null ||
      notification.entity_type === undefined,
  );
  TestValidator.predicate(
    "entity_id should not be set",
    () =>
      notification.entity_id === null || notification.entity_id === undefined,
  );
  TestValidator.predicate(
    "entity_display should not be set",
    () =>
      notification.entity_display === null ||
      notification.entity_display === undefined,
  );

  // Unread, non-archived defaults
  TestValidator.predicate(
    "read_at should be null or undefined for unread notification",
    () => notification.read_at === null || notification.read_at === undefined,
  );
  TestValidator.predicate(
    "archived_at should be null or undefined for new notification",
    () =>
      notification.archived_at === null ||
      notification.archived_at === undefined,
  );

  // Soft-delete should not be applied on creation
  TestValidator.predicate(
    "deleted_at should be null or undefined for newly created notification",
    () =>
      notification.deleted_at === null || notification.deleted_at === undefined,
  );
}
