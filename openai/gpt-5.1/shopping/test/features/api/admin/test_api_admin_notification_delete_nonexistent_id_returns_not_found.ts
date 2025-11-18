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
 * Ensure deleting a non-existent admin notification id fails without impacting
 * existing notifications.
 *
 * Business goal
 *
 * - When an admin calls the erase API with a bogus notification id, the backend
 *   must respond with an error instead of silently succeeding, and must not
 *   delete any real notifications.
 *
 * Steps
 *
 * 1. Join as an admin using POST /auth/admin/join to get an authorized admin
 *    session (the SDK automatically wires the access token into the connection
 *    headers).
 * 2. Create a real admin notification via POST
 *    /shoppingMall/admin/adminNotifications using a valid
 *    IShoppingMallAdminNotification.ICreate body so we have at least one
 *    existing row.
 * 3. Generate a random UUID string that is different from the created
 *    notification.id and use it as a non-existent adminNotificationId.
 * 4. While authenticated as this admin, call
 *    api.functional.shoppingMall.admin.adminNotifications.erase with the bogus
 *    id and assert via TestValidator.error that an error is thrown for this
 *    invalid deletion attempt (without checking a specific HTTP status code).
 * 5. Finally, verify that the valid notification can still be deleted by calling
 *    erase again with the real id and ensuring the call completes successfully
 *    without throwing.
 */
export async function test_api_admin_notification_delete_nonexistent_id_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authorized context (token handled by SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a real admin notification so the table has at least one row
  const notificationCreateBody = {
    shopping_mall_admin_id: admin.id,
    related_risk_case_id: null,
    related_legal_hold_id: null,
    type: "risk_sla_violation",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    status: "unread",
    priority: "high",
    entity_type: null,
    entity_id: null,
    entity_display: null,
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
  typia.assert(created);

  // 3. Generate a bogus UUID that differs from the created notification id
  let bogusId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (bogusId === created.id) {
    bogusId = typia.random<string & tags.Format<"uuid">>();
  }

  TestValidator.predicate(
    "bogus adminNotificationId must differ from real notification id",
    bogusId !== created.id,
  );

  // 4. Attempt to erase using non-existent id and assert an error occurs
  await TestValidator.error(
    "erase with non-existent id should fail",
    async () => {
      await api.functional.shoppingMall.admin.adminNotifications.erase(
        connection,
        {
          adminNotificationId: bogusId,
        },
      );
    },
  );

  // 5. Ensure the real notification can still be deleted successfully
  await api.functional.shoppingMall.admin.adminNotifications.erase(connection, {
    adminNotificationId: created.id,
  });
}
