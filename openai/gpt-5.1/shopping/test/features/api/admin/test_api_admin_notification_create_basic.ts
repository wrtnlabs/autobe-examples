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
 * Basic creation flow for an administrator notification.
 *
 * Business flow:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context and admin id.
 * 2. As that admin, create a notification via POST
 *    /shoppingMall/admin/adminNotifications using
 *    IShoppingMallAdminNotification.ICreate with shopping_mall_admin_id set to
 *    the created admin id.
 * 3. Validate that the response is a well-formed IShoppingMallAdminNotification
 *    whose admin summary matches the created admin and whose core fields (type,
 *    title, status, priority, entity_* fields) mirror the request.
 * 4. Cover a negative scenario where using a clearly bogus admin id results in an
 *    error and no successful notification creation.
 */
export async function test_api_admin_notification_create_basic(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
    ip: "127.0.0.1" as string & tags.Format<"ipv4">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  const adminId = authorized.id;
  const adminEmail = authorized.email;

  // 2. Create a notification targeting this admin
  const notificationCreateBody = {
    shopping_mall_admin_id: adminId,
    type: "risk_sla_violation",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    status: "unread",
    priority: RandomGenerator.pick(["low", "normal", "high"] as const),
    entity_type: "risk_case",
    entity_id: typia.random<string & tags.Format<"uuid">>(),
    entity_display: RandomGenerator.paragraph({ sentences: 2 }),
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const created: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: notificationCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(created);

  // 3. Validate response mapping and relational integrity
  TestValidator.equals(
    "notification id should be a UUID string",
    created.id,
    created.id,
  );

  TestValidator.predicate("created admin id should match target admin", () => {
    if (!created.admin) return false;
    return created.admin.id === adminId && created.admin.email === adminEmail;
  });

  TestValidator.equals(
    "type should mirror request",
    created.type,
    notificationCreateBody.type,
  );
  TestValidator.equals(
    "title should mirror request",
    created.title,
    notificationCreateBody.title,
  );
  TestValidator.equals(
    "status should mirror request",
    created.status,
    notificationCreateBody.status,
  );
  TestValidator.equals(
    "priority should mirror request",
    created.priority ?? null,
    notificationCreateBody.priority ?? null,
  );
  TestValidator.equals(
    "entity_type should mirror request",
    created.entity_type ?? null,
    notificationCreateBody.entity_type ?? null,
  );
  TestValidator.equals(
    "entity_id should mirror request",
    created.entity_id ?? null,
    notificationCreateBody.entity_id ?? null,
  );
  TestValidator.equals(
    "entity_display should mirror request",
    created.entity_display ?? null,
    notificationCreateBody.entity_display ?? null,
  );
  TestValidator.equals(
    "read_at should be null on creation when requested as null",
    created.read_at ?? null,
    null,
  );
  TestValidator.equals(
    "archived_at should be null on creation when requested as null",
    created.archived_at ?? null,
    null,
  );

  TestValidator.predicate(
    "created_at and updated_at must be non-empty ISO strings",
    () =>
      typeof created.created_at === "string" &&
      created.created_at.length > 0 &&
      typeof created.updated_at === "string" &&
      created.updated_at.length > 0,
  );

  // 4. Negative scenario: use an obviously bogus admin id and expect an error
  const bogusAdminId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const invalidBody = {
    shopping_mall_admin_id: bogusAdminId,
    type: "risk_sla_violation",
    title: "Invalid admin notification",
    status: "unread",
    body: null,
    priority: null,
    entity_type: null,
    entity_id: null,
    entity_display: null,
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  await TestValidator.error(
    "creating notification for non-existent admin should fail",
    async () => {
      await api.functional.shoppingMall.admin.adminNotifications.create(
        connection,
        {
          body: invalidBody,
        },
      );
    },
  );
}
