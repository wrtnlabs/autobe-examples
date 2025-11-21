import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAlert";

/**
 * Test successful retrieval of an active inventory alert with low stock status.
 *
 * This test verifies that the system can successfully retrieve an inventory
 * alert by its ID. Since the API only provides a retrieval endpoint (GET
 * /shoppingMall/inventory/alerts/{alertId}) and no way to create or list
 * alerts, we generate a random UUID alertId and retrieve the alert. The test
 * validates that the returned alert has the correct structure with required
 * fields: alert_type, threshold, current_stock, alerted_at, status, cleared_at,
 * inventory_unit_id, and seller_id.
 *
 * Note: The alert must be pre-existing in the system (created by other
 * operations not exposed in this API). This test validates the retrieval
 * endpoint works for a valid alert, not the alert creation workflow.
 */
export async function test_api_inventory_alert_retrieval_low_stock(
  connection: api.IConnection,
) {
  // Generate a random UUID alertId (real alert must exist in system)
  const alertId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the inventory alert by ID
  const alert = await api.functional.shoppingMall.inventory.alerts.at(
    connection,
    {
      alertId: alertId,
    },
  );
  typia.assert(alert);

  // Validate all returned properties match the expected structure
  // Note: The alert can be active or cleared - we're validating structure, not state
  TestValidator.equals(
    "alert_type should be one of allowed values",
    alert.alert_type === "low_stock" ||
      alert.alert_type === "critical_stock" ||
      alert.alert_type === "back_in_stock",
    true,
  );
  TestValidator.predicate(
    "threshold should be a number",
    typeof alert.threshold === "number",
  );
  TestValidator.predicate(
    "current_stock should be a number",
    typeof alert.current_stock === "number",
  );
  TestValidator.predicate(
    "alerted_at should be ISO date-time",
    typia.is<string & tags.Format<"date-time">>(alert.alerted_at),
  );
  TestValidator.equals(
    "status should be active or cleared",
    alert.status === "active" || alert.status === "cleared",
    true,
  );
  TestValidator.predicate(
    "cleared_at should be null, undefined, or ISO date-time",
    alert.cleared_at === null ||
      alert.cleared_at === undefined ||
      typia.is<string & tags.Format<"date-time">>(alert.cleared_at),
  );
  TestValidator.predicate(
    "inventory_unit_id should be UUID",
    typia.is<string & tags.Format<"uuid">>(alert.inventory_unit_id),
  );
  TestValidator.predicate(
    "seller_id should be UUID",
    typia.is<string & tags.Format<"uuid">>(alert.seller_id),
  );
}
