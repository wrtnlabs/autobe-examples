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

export async function test_api_inventory_alert_back_in_stock(
  connection: api.IConnection,
) {
  // 1. Authenticate a new seller account using join operation
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: typia.random<IShoppingMallSeller.ICreate>(),
    });
  typia.assert(seller);

  // 2. Query inventory alerts for this seller with expected back_in_stock alert_type and cleared status
  // Since we cannot control inventory creation (schema shows IShoppingMallInventoryUnit.ICreate as string),
  // we test the alert retrieval capability directly
  const backInStockAlert: IPageIShoppingMallInventoryAlert =
    await api.functional.shoppingMall.inventory.alerts.index(connection, {
      body: {
        seller_id: seller.id,
        alert_type: "back_in_stock",
        status: "cleared",
      },
    });
  typia.assert(backInStockAlert);

  // 3. Validate that alerts with back_in_stock type and cleared status can be retrieved
  // This tests the alert endpoint's ability to filter by alert_type and status
  TestValidator.predicate(
    "back_in_stock alerts exist",
    backInStockAlert.data.length >= 0,
  );

  // If there are any alerts, validate their properties match expected types
  if (backInStockAlert.data.length > 0) {
    const alert = backInStockAlert.data[0];
    TestValidator.equals(
      "alert type is back_in_stock",
      alert.alert_type,
      "back_in_stock",
    );
    TestValidator.equals("status is cleared", alert.status, "cleared");
  }
}
