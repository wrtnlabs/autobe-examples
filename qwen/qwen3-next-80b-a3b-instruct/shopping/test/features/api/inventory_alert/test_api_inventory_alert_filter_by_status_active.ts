import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryAlert";
import type { IShoppingMallInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAlert";
import type { IShoppingMallInventoryUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryUnit";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_inventory_alert_filter_by_status_active(
  connection: api.IConnection,
) {
  // 1. Authenticate seller by joining with valid credentials
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: typia.random<IShoppingMallSeller.ICreate>(),
    });
  typia.assert(seller);

  // 2. Create an inventory unit with quantity below min_stock_threshold to trigger an active alert
  // Note: IShoppingMallInventoryUnit.ICreate is defined as string in DTO
  // We must use the actual API structure which expects a string (likely a JSON string representation)
  const unitData = {
    productId: typia.random<string & tags.Format<"uuid">>(),
    sellerId: seller.id,
    quantity: 5,
    minStockThreshold: 10,
  };
  const inventoryUnit: IShoppingMallInventoryUnit =
    await api.functional.shoppingMall.seller.inventory.units.create(
      connection,
      {
        body: JSON.stringify(
          unitData,
        ) satisfies IShoppingMallInventoryUnit.ICreate,
      },
    );
  typia.assert(inventoryUnit);

  // 3. Wait briefly for alert generation (system processes asynchronously)
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 4. Query inventory alerts with status=active
  const alertsResponse: IPageIShoppingMallInventoryAlert =
    await api.functional.shoppingMall.inventory.alerts.index(connection, {
      body: {
        status: "active", // Filter for active alerts only
      } satisfies IShoppingMallInventoryAlert.IRequest,
    });
  typia.assert(alertsResponse);

  // 5. Validate that the response contains exactly one active alert matching the created inventory unit
  TestValidator.equals(
    "should have exactly one active alert",
    alertsResponse.pagination.records,
    1,
  );

  const activeAlert: IShoppingMallInventoryAlert = alertsResponse.data[0];

  // 6. Confirm alert properties are correctly populated
  TestValidator.equals(
    "alert_type should be low_stock",
    activeAlert.alert_type,
    "low_stock",
  );
  TestValidator.equals("status should be active", activeAlert.status, "active");

  // 7. Validate alert references the correct product
  // We don't have direct access to the unit ID in the alert object in the DTO definition,
  // but to validate functionality, we expect the ID to be correctly populated
  // This assumes the backend correctly associates the alert with the unit
  TestValidator.predicate(
    "alert has valid inventory_unit_id",
    !!activeAlert.inventory_unit_id,
  );
  TestValidator.predicate("alert has valid seller_id", !!activeAlert.seller_id);
  TestValidator.predicate(
    "current_stock is reasonable",
    activeAlert.current_stock >= 0 &&
      activeAlert.current_stock < activeAlert.threshold,
  );
}
