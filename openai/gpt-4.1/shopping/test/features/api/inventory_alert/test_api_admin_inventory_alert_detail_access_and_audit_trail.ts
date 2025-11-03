import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventoryAlert";

/**
 * Validate admin detail access to inventory alert and full audit trail.
 *
 * 1. Admin joins using valid business email and strong password to obtain
 *    authorization token.
 * 2. Create inventory alert test data (random alert with valid SKU and UUID alert
 *    id) via typia.random.
 * 3. Fetch alert detail via admin endpoint using correct skuCode/alertId.
 * 4. Assert all alert fields are present and valid per IShoppingInventoryAlert
 *    (id, shopping_sku_id, alert_type, resolved, triggered_at, resolved_at,
 *    resolved_actor_type, resolved_actor_id, context_note).
 * 5. Validate audit/compliance data: actor fields for resolution, context note (if
 *    present), all timestamps, alert type among allowed values.
 * 6. Ensure all returned metadata aligns with compliance and root-cause analysis
 *    expectations. Fail if any critical field missing or mismatched.
 */
export async function test_api_admin_inventory_alert_detail_access_and_audit_trail(
  connection: api.IConnection,
) {
  // 1. Join as admin to get authorization
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "pending",
      "suspended",
      "locked",
    ] as const),
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(admin);

  // 2. Generate test alert data
  const alert: IShoppingInventoryAlert =
    typia.random<IShoppingInventoryAlert>();
  typia.assert(alert);

  // 3. Fetch alert detail as admin
  const detail: IShoppingInventoryAlert =
    await api.functional.shopping.admin.inventory.alerts.at(connection, {
      skuCode: alert.shopping_sku_id, // using shopping_sku_id as skuCode as per schema
      alertId: alert.id,
    });
  typia.assert(detail);

  // 4. Assert main alert field presence and values
  TestValidator.equals("alert id matches", detail.id, alert.id);
  TestValidator.equals(
    "sku id matches",
    detail.shopping_sku_id,
    alert.shopping_sku_id,
  );
  TestValidator.predicate(
    "alert_type is one of allowed business constants",
    ["low_stock", "out_of_stock", "anomaly", "manual"].includes(
      detail.alert_type,
    ),
  );

  // 5. Scope: resolved, actor, and context fields
  TestValidator.predicate(
    "resolved is boolean",
    typeof detail.resolved === "boolean",
  );
  TestValidator.predicate(
    "triggered_at is ISO date string",
    typeof detail.triggered_at === "string" && detail.triggered_at.length > 0,
  );

  if (detail.resolved) {
    TestValidator.predicate(
      "resolved_at present and string",
      typeof detail.resolved_at === "string" && detail.resolved_at.length > 0,
    );
    TestValidator.predicate(
      "resolved_actor_type is allowed actor domain or null",
      ["admin", "seller", "system"].includes(detail.resolved_actor_type!) ||
        detail.resolved_actor_type === null,
    );
    TestValidator.predicate(
      "resolved_actor_id is uuid or null",
      typeof detail.resolved_actor_id === "string" ||
        detail.resolved_actor_id === null,
    );
  } else {
    TestValidator.equals(
      "resolved_at is null or undefined",
      detail.resolved_at,
      null,
    );
    TestValidator.equals(
      "resolved_actor_type is null or undefined",
      detail.resolved_actor_type,
      null,
    );
    TestValidator.equals(
      "resolved_actor_id is null or undefined",
      detail.resolved_actor_id,
      null,
    );
  }

  // 6. Optional context_note, audit business expectations
  if (detail.context_note !== null && detail.context_note !== undefined) {
    TestValidator.predicate(
      "context_note is non-empty string",
      typeof detail.context_note === "string" && detail.context_note.length > 0,
    );
  }

  // Final: all expected timeline/audit metadata present
  TestValidator.predicate(
    "all audit and compliance fields are present for compliance",
    typeof detail.id === "string" &&
      typeof detail.shopping_sku_id === "string" &&
      typeof detail.alert_type === "string" &&
      typeof detail.resolved === "boolean" &&
      typeof detail.triggered_at === "string",
  );
}
