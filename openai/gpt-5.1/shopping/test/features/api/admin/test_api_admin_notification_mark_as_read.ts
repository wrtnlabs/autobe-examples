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
 * Validate that an authenticated admin can mark one of their own notifications
 * as read.
 *
 * Business flow:
 *
 * 1. Register a new admin using POST /auth/admin/join to obtain an authenticated
 *    admin context.
 * 2. Create an unread admin notification for that admin using POST
 *    /shoppingMall/admin/adminNotifications with status "unread" and no
 *    read_at/archived_at.
 * 3. Call PUT /shoppingMall/admin/adminNotifications/{adminNotificationId} with an
 *    IShoppingMallAdminNotification.IUpdate body that sets status="read" and
 *    read_at to the current timestamp, leaving other fields undefined so they
 *    stay unchanged.
 * 4. Verify the updated notification reflects the read status and read_at change
 *    while preserving immutable/meta fields.
 */
export async function test_api_admin_notification_mark_as_read(
  connection: api.IConnection,
) {
  // 1. Register an admin (join) to get authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an unread admin notification for this admin
  const createNotificationBody = {
    shopping_mall_admin_id: adminAuthorized.id,
    related_risk_case_id: null,
    related_legal_hold_id: null,
    type: "risk_sla_violation",
    title: "Risk SLA breach detected",
    body: RandomGenerator.paragraph({ sentences: 5 }),
    status: "unread",
    priority: "high",
    entity_type: "risk_case",
    entity_id: typia.random<string & tags.Format<"uuid">>(),
    entity_display: "RISK-" + RandomGenerator.alphaNumeric(8).toUpperCase(),
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const createdNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      { body: createNotificationBody },
    );
  typia.assert<IShoppingMallAdminNotification>(createdNotification);

  // Keep original values for comparison
  const original = createdNotification;

  // 3. Mark the notification as read using update
  const readTimestamp = new Date().toISOString();

  const updateBody = {
    status: "read",
    read_at: readTimestamp,
  } satisfies IShoppingMallAdminNotification.IUpdate;

  const updatedNotification =
    await api.functional.shoppingMall.admin.adminNotifications.update(
      connection,
      {
        adminNotificationId: createdNotification.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(updatedNotification);

  // 4. Business assertions
  // 4-1. Status changed to "read"
  TestValidator.equals(
    "notification status should be updated to read",
    updatedNotification.status,
    "read",
  );

  // 4-2. read_at should be set and match the timestamp we sent
  TestValidator.equals(
    "notification read_at should be updated to provided timestamp",
    updatedNotification.read_at,
    readTimestamp,
  );

  // 4-3. archived_at remains null
  TestValidator.equals(
    "notification archived_at should remain null",
    updatedNotification.archived_at,
    null,
  );

  // 4-4. id is preserved
  TestValidator.equals(
    "notification id should remain unchanged",
    updatedNotification.id,
    original.id,
  );

  // 4-5. Core descriptive fields are preserved
  TestValidator.equals(
    "notification type should remain unchanged",
    updatedNotification.type,
    original.type,
  );
  TestValidator.equals(
    "notification title should remain unchanged",
    updatedNotification.title,
    original.title,
  );
  TestValidator.equals(
    "notification body should remain unchanged",
    updatedNotification.body,
    original.body,
  );
  TestValidator.equals(
    "notification priority should remain unchanged",
    updatedNotification.priority,
    original.priority,
  );
  TestValidator.equals(
    "notification entity_type should remain unchanged",
    updatedNotification.entity_type,
    original.entity_type,
  );
  TestValidator.equals(
    "notification entity_id should remain unchanged",
    updatedNotification.entity_id,
    original.entity_id,
  );
  TestValidator.equals(
    "notification entity_display should remain unchanged",
    updatedNotification.entity_display,
    original.entity_display,
  );

  // 4-6. created_at unchanged, updated_at changed
  TestValidator.equals(
    "notification created_at should remain unchanged",
    updatedNotification.created_at,
    original.created_at,
  );
  TestValidator.notEquals(
    "notification updated_at should change after update",
    updatedNotification.updated_at,
    original.updated_at,
  );
}
