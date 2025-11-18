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
 * Validate retrieval of a single admin notification detail after creation.
 *
 * Business goal: Ensure that once an administrator is registered and an admin
 * notification is created for that admin, the detail endpoint GET
 * /shoppingMall/admin/adminNotifications/{adminNotificationId} returns a full
 * IShoppingMallAdminNotification whose fields and associations accurately
 * reflect the created record.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin via POST /auth/admin/join.
 * 2. Create a new admin notification for that admin via POST
 *    /shoppingMall/admin/adminNotifications, supplying representative values
 *    for type, title, body, status, priority and entity_* fields while leaving
 *    related_risk_case_id and related_legal_hold_id null.
 * 3. Retrieve the notification by its id using GET
 *    /shoppingMall/admin/adminNotifications/{adminNotificationId}.
 * 4. Assert that all core fields (type, title, body, status, priority,
 *    entity_type, entity_id, entity_display, read_at, archived_at, created_at,
 *    updated_at, deleted_at) and admin association match expectations from the
 *    creation step and that relatedRiskCase / relatedLegalHold are null.
 */
export async function test_api_admin_notification_detail_retrieval_basic(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  const adminId = authorizedAdmin.id;

  // 2. Create a new admin notification for that admin
  const notificationCreateBody = {
    shopping_mall_admin_id: adminId,
    related_risk_case_id: null,
    related_legal_hold_id: null,
    type: "risk_sla_violation",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    status: "unread",
    priority: "high",
    entity_type: "order",
    entity_id: typia.random<string & tags.Format<"uuid">>(),
    entity_display: RandomGenerator.paragraph({ sentences: 2 }),
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const created: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      { body: notificationCreateBody },
    );
  typia.assert(created);

  // 3. Retrieve the notification by its id
  const fetched: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.at(connection, {
      adminNotificationId: created.id,
    });
  typia.assert(fetched);

  // 4. Validate identity and field equality
  TestValidator.equals("notification id must match", fetched.id, created.id);

  // Admin association should point to the same admin
  if (fetched.admin !== undefined) {
    TestValidator.equals(
      "associated admin id should equal authorized admin id",
      fetched.admin.id,
      adminId,
    );
  }

  // Risk and legal hold associations should be null because we set ids to null
  TestValidator.equals(
    "relatedRiskCase must be null when related_risk_case_id is null",
    fetched.relatedRiskCase ?? null,
    null,
  );
  TestValidator.equals(
    "relatedLegalHold must be null when related_legal_hold_id is null",
    fetched.relatedLegalHold ?? null,
    null,
  );

  // Business fields must match
  TestValidator.equals("type matches", fetched.type, created.type);
  TestValidator.equals("title matches", fetched.title, created.title);
  TestValidator.equals(
    "body matches",
    fetched.body ?? null,
    created.body ?? null,
  );
  TestValidator.equals("status matches", fetched.status, created.status);
  TestValidator.equals(
    "priority matches",
    fetched.priority ?? null,
    created.priority ?? null,
  );
  TestValidator.equals(
    "entity_type matches",
    fetched.entity_type ?? null,
    created.entity_type ?? null,
  );
  TestValidator.equals(
    "entity_id matches",
    fetched.entity_id ?? null,
    created.entity_id ?? null,
  );
  TestValidator.equals(
    "entity_display matches",
    fetched.entity_display ?? null,
    created.entity_display ?? null,
  );

  // read_at and archived_at should remain null as we set them null on creation
  TestValidator.equals(
    "read_at remains null",
    fetched.read_at ?? null,
    created.read_at ?? null,
  );
  TestValidator.equals(
    "archived_at remains null",
    fetched.archived_at ?? null,
    created.archived_at ?? null,
  );

  // Temporal fields and soft delete should match
  TestValidator.equals(
    "created_at matches",
    fetched.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    fetched.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    fetched.deleted_at ?? null,
    created.deleted_at ?? null,
  );
}
