import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallLowStockAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLowStockAlert";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Test creating a new low stock alert record for monitoring SKU inventory
 * levels by an admin user.
 *
 * The test performs the following steps:
 *
 * 1. Authenticate as admin by calling auth.admin.join with generated admin join
 *    data.
 * 2. Create a product SKU for an existing product code by calling
 *    shoppingMall.admin.products.skus.createSku with realistic SKU data.
 * 3. Create a low stock alert by calling shoppingMall.admin.lowStockAlerts.create,
 *    referencing the SKU ID from step 2, with the current UTC timestamp as
 *    alert time and resolved as false.
 * 4. Validate the returned low stock alert data including correct SKU reference,
 *    alert timestamp, unresolved state, and proper UUID format.
 * 5. Attempt to create a low stock alert with an invalid SKU ID and assert that an
 *    error is thrown.
 *
 * This test ensures security, data integrity, and error handling of the low
 * stock alert creation feature.
 */
export async function test_api_low_stock_alert_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody: IShoppingMallAdmin.IJoin = {
    email: adminEmail,
    password: "StrongPassword123!",
    full_name: RandomGenerator.name(),
  };
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create product SKU for a product code
  // We pick a realistic product code string
  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const skuCreateBody: IShoppingMallProductSku.ICreate = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    price: Number((Math.random() * 100 + 10).toFixed(2)),
    attributes_json: JSON.stringify({
      color: RandomGenerator.pick(["red", "blue", "green"] as const),
      size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
    }),
  };
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.createSku(
      connection,
      {
        productCode,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 3. Create low stock alert referencing the SKU id
  const nowIso = new Date().toISOString();
  const lowStockAlertCreateBody: IShoppingMallLowStockAlert.ICreate = {
    shopping_mall_product_sku_id: sku.id,
    alerted_at: nowIso,
    resolved: false,
    resolved_at: null,
  };
  const alert: IShoppingMallLowStockAlert =
    await api.functional.shoppingMall.admin.lowStockAlerts.create(connection, {
      body: lowStockAlertCreateBody,
    });
  typia.assert(alert);

  // 4. Validate returned alert data
  TestValidator.equals(
    "SKU id matches",
    alert.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals("Alert timestamp matches", alert.alerted_at, nowIso);
  TestValidator.equals("Alert is unresolved initially", alert.resolved, false);
  TestValidator.predicate(
    "Alert resolved_at is null or undefined",
    alert.resolved_at === null || alert.resolved_at === undefined,
  );

  // 5. Attempt to create a low stock alert with an invalid SKU id and expect error
  await TestValidator.error(
    "Creating alert with invalid SKU id should fail",
    async () => {
      await api.functional.shoppingMall.admin.lowStockAlerts.create(
        connection,
        {
          body: {
            shopping_mall_product_sku_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            alerted_at: new Date().toISOString(),
            resolved: false,
            resolved_at: null,
          } satisfies IShoppingMallLowStockAlert.ICreate,
        },
      );
    },
  );
}
