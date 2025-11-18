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
 * Validate that an admin notification can be created directly in a "read"
 * state.
 *
 * Business context:
 *
 * - Some notifications represent historical or system-imported events that should
 *   not surface as unread in the admin inbox.
 * - The creation endpoint should allow callers to set both `status` and `read_at`
 *   at creation time to reflect backfilled read state.
 *
 * Scenario steps:
 *
 * 1. Register a new admin via POST /auth/admin/join.
 *
 *    - This returns IShoppingMallAdmin.IAuthorized and also sets the Authorization
 *         header on the connection for subsequent calls.
 * 2. Using this authenticated context, create an admin notification via POST
 *    /shoppingMall/admin/adminNotifications with:
 *
 *    - Shopping_mall_admin_id: the id of the newly created admin.
 *    - Type: a non-empty string such as "historical_data_backfill".
 *    - Title: a non-empty title string.
 *    - Body: optional descriptive text (we will provide a value).
 *    - Status: explicitly "read".
 *    - Priority: a concrete value like "normal".
 *    - Entity_type, entity_id, entity_display: explicitly null to represent no
 *         linked entity.
 *    - Related_risk_case_id, related_legal_hold_id: explicitly null to represent no
 *         linked governance objects.
 *    - Read_at: a past ISO 8601 date-time string (e.g. now minus 1 hour).
 *    - Archived_at: explicitly null.
 * 3. Verify that the response is a valid IShoppingMallAdminNotification and that
 *    key fields reflect the requested initial read state:
 *
 *    - Status === "read".
 *    - Read_at is not null and equals the value we supplied.
 *    - Archived_at === null.
 *    - Shopping mall admin relation (if present) has id equal to
 *         shopping_mall_admin_id.
 */
export async function test_api_admin_notification_creation_with_initial_read_state(
  connection: api.IConnection,
) {
  // 1. Register a new admin (dependency: POST /auth/admin/join)
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  const adminId = authorizedAdmin.id;

  // 2. Prepare a past read_at timestamp (e.g., one hour ago)
  const now = new Date();
  const oneHourMs = 60 * 60 * 1000;
  const readAt = new Date(now.getTime() - oneHourMs).toISOString();

  // 3. Build the notification creation payload with initial read state
  const createBody = {
    shopping_mall_admin_id: adminId,
    related_risk_case_id: null,
    related_legal_hold_id: null,
    type: "historical_data_backfill",
    title: "Imported historical notification",
    body: RandomGenerator.paragraph({ sentences: 5 }),
    status: "read",
    priority: "normal",
    entity_type: null,
    entity_id: null,
    entity_display: null,
    read_at: readAt,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const created: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallAdminNotification>(created);

  // 4. Validate status and timestamps
  TestValidator.equals(
    "notification status should be 'read' at creation",
    created.status,
    createBody.status,
  );

  // Ensure read_at is present and matches the provided timestamp
  TestValidator.predicate("read_at should not be null or undefined", () => {
    return created.read_at !== null && created.read_at !== undefined;
  });
  TestValidator.equals(
    "notification read_at should match the provided timestamp",
    created.read_at!,
    createBody.read_at,
  );

  // archived_at should remain null
  TestValidator.equals(
    "notification archived_at should remain null",
    created.archived_at ?? null,
    null,
  );

  // 5. If admin relation is included, its id should match shopping_mall_admin_id
  if (created.admin !== undefined) {
    TestValidator.equals(
      "related admin id should match shopping_mall_admin_id",
      created.admin.id,
      createBody.shopping_mall_admin_id,
    );
  }
}
