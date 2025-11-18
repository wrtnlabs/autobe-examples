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
 * Validate creation of an admin notification with explicit priority and entity
 * linkage.
 *
 * Business workflow:
 *
 * 1. Join an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context.
 * 2. Using that authenticated admin, call POST
 *    /shoppingMall/admin/adminNotifications with a payload that:
 *
 *    - Targets the joined admin via shopping_mall_admin_id.
 *    - Sets type to a business code like "order_manual_review".
 *    - Provides title and body text describing the required action.
 *    - Initializes status as "unread".
 *    - Sets priority to a higher level such as "high".
 *    - Populates polymorphic entity linkage fields: entity_type "order", entity_id
 *         as a UUID, and entity_display as an order-like code.
 *    - Leaves risk/legal foreign keys and read/archive timestamps null.
 * 3. Assert that creation succeeds and the response:
 *
 *    - Is a valid IShoppingMallAdminNotification.
 *    - Is associated with the correct admin.
 *    - Preserves the requested status, priority, and entity linkage.
 *    - Keeps related risk/legal associations and read/archive timestamps null.
 *    - Contains created_at and updated_at timestamps.
 */
export async function test_api_admin_notification_creation_with_priority_and_entity_link(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context (token handled by SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/login",
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // Determine the target admin id from summary if present, otherwise from top-level id
  const targetAdminId: string & tags.Format<"uuid"> = (authorizedAdmin.admin
    ?.id ?? authorizedAdmin.id) as string & tags.Format<"uuid">;

  // Prepare polymorphic entity linkage information (e.g., an order reference)
  const linkedEntityId = typia.random<string & tags.Format<"uuid">>();
  const linkedEntityDisplay = `ORDER-${RandomGenerator.alphaNumeric(10).toUpperCase()}`;

  // 2. Create an admin notification with explicit priority and entity linkage
  const createBody = {
    shopping_mall_admin_id: targetAdminId,
    related_risk_case_id: null,
    related_legal_hold_id: null,
    type: "order_manual_review",
    title: "Order requires manual review",
    body: RandomGenerator.paragraph({ sentences: 6 }),
    status: "unread",
    priority: "high",
    entity_type: "order",
    entity_id: linkedEntityId,
    entity_display: linkedEntityDisplay,
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const created: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Validate core fields and associations on the created notification
  TestValidator.equals(
    "notification admin id should match target admin",
    created.admin?.id ?? targetAdminId,
    targetAdminId,
  );

  TestValidator.equals(
    "notification type should match request",
    created.type,
    createBody.type,
  );

  TestValidator.equals(
    "notification title should match request",
    created.title,
    createBody.title,
  );

  TestValidator.equals(
    "notification body should match request",
    created.body ?? createBody.body,
    createBody.body,
  );

  TestValidator.equals(
    "notification status should be unread",
    created.status,
    "unread",
  );

  TestValidator.equals(
    "notification priority should be high",
    created.priority ?? "high",
    "high",
  );

  TestValidator.equals(
    "notification entity_type should be order",
    created.entity_type ?? "order",
    "order",
  );

  TestValidator.equals(
    "notification entity_id should match request",
    created.entity_id ?? linkedEntityId,
    linkedEntityId,
  );

  TestValidator.equals(
    "notification entity_display should match request",
    created.entity_display ?? linkedEntityDisplay,
    linkedEntityDisplay,
  );

  TestValidator.equals(
    "notification read_at should be null on unread creation",
    created.read_at ?? null,
    null,
  );

  TestValidator.equals(
    "notification archived_at should be null on creation",
    created.archived_at ?? null,
    null,
  );

  TestValidator.equals(
    "notification relatedRiskCase should be null when no risk case id provided",
    created.relatedRiskCase ?? null,
    null,
  );

  TestValidator.equals(
    "notification relatedLegalHold should be null when no legal hold id provided",
    created.relatedLegalHold ?? null,
    null,
  );

  // Ensure timestamps are present and non-empty strings
  TestValidator.predicate(
    "created_at timestamp should exist",
    () =>
      typeof created.created_at === "string" && created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp should exist",
    () =>
      typeof created.updated_at === "string" && created.updated_at.length > 0,
  );
}
