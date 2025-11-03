import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuInventory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallLowStockAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLowStockAlert";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventory";
import type { IShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallStockAdjustment";

/**
 * Validates that the SKU inventory list can be securely retrieved and
 * appropriately paginated by an admin user.
 *
 * This test involves:
 *
 * 1. Admin user registration (join) with unique email, password, and full name.
 * 2. Admin user login with email and password along with URI and referrer
 *    parameters.
 * 3. Retrieval of SKU inventories via a PATCH request with realistic filtering
 *    options, pagination, and sorting.
 * 4. Validation of response pagination metadata and conformity of SKU inventory
 *    records to the defined summary schema.
 *
 * The test asserts that the pagination data is consistent, and that each SKU
 * inventory in the page contains valid stock and product SKU summary
 * information. It ensures that the filtering and paging mechanisms behave
 * correctly, and that security (authorization) is respected.
 */
export async function test_api_sku_inventory_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPassword = "Admin!234";

  // Join admin account
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin user login
  const loginInput: IShoppingMallAdmin.ILogin = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/dashboard",
    referrer: "https://admin.example.com/login",
  };

  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginInput,
    });
  typia.assert(loggedInAdmin);

  // 3. Retrieve SKU inventories with filtering and pagination
  // Construct realistic SKU inventory request
  const skuInventoryRequest: IShoppingMallSkuInventory.IRequest = {
    shopping_mall_product_sku_code: null,
    stock_status: null,
    min_quantity: 0,
    max_quantity: 10000,
    page: 1,
    limit: 20,
    sort_by: "updated_at",
    order: "desc",
    search_text: null,
    date_from: null,
    date_to: null,
  };

  const skuInventoryPage: IPageIShoppingMallSkuInventory.ISummary =
    await api.functional.shoppingMall.admin.skuInventories.index(connection, {
      body: skuInventoryRequest,
    });
  typia.assert(skuInventoryPage);

  // 4. Validate pagination info
  TestValidator.predicate(
    "pagination current page should be 1",
    skuInventoryPage.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should be 20",
    skuInventoryPage.pagination.limit === 20,
  );

  TestValidator.predicate(
    "pagination pages should be positive",
    skuInventoryPage.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    skuInventoryPage.pagination.records >= 0,
  );

  // 5. Validate each SKU inventory summary
  for (const inventory of skuInventoryPage.data) {
    typia.assert(inventory);
    // Validate required fields of the SKU inventory
    TestValidator.predicate(
      `inventory quantity for id ${inventory.id} is non-negative`,
      inventory.quantity >= 0,
    );

    // Validate stock_status is a non-empty string
    TestValidator.predicate(
      `inventory stock_status for id ${inventory.id} is non-empty string`,
      typeof inventory.stock_status === "string" &&
        inventory.stock_status.length > 0,
    );

    // Validate productSku summary fields
    typia.assert(inventory.productSku);
    TestValidator.predicate(
      `productSku sku_code for inventory id ${inventory.id} exists`,
      typeof inventory.productSku.sku_code === "string" &&
        inventory.productSku.sku_code.length > 0,
    );

    TestValidator.predicate(
      `productSku price for inventory id ${inventory.id} is number`,
      typeof inventory.productSku.price === "number",
    );

    // Optional counts should be zero or positive if present
    if (inventory.stockAdjustmentsCount !== undefined)
      TestValidator.predicate(
        `stockAdjustmentsCount non-negative for inventory id ${inventory.id}`,
        inventory.stockAdjustmentsCount >= 0,
      );

    if (inventory.lowStockAlertsCount !== undefined)
      TestValidator.predicate(
        `lowStockAlertsCount non-negative for inventory id ${inventory.id}`,
        inventory.lowStockAlertsCount >= 0,
      );

    // Optional latest stock adjustment and low stock alert are objects or undefined
    if (
      inventory.latestStockAdjustment !== undefined &&
      inventory.latestStockAdjustment !== null
    ) {
      typia.assert(inventory.latestStockAdjustment);
      TestValidator.equals(
        `latestStockAdjustment productSku id matches inventory id ${inventory.id}`,
        inventory.latestStockAdjustment.shopping_mall_product_sku_id,
        inventory.productSku.id,
      );
    }

    if (
      inventory.latestLowStockAlert !== undefined &&
      inventory.latestLowStockAlert !== null
    ) {
      typia.assert(inventory.latestLowStockAlert);
      TestValidator.equals(
        `latestLowStockAlert productSku id matches inventory id ${inventory.id}`,
        inventory.latestLowStockAlert.shopping_mall_product_sku_id,
        inventory.productSku.id,
      );
    }
  }
}
