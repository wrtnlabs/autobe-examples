import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_inventory_history_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `admin+test${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "12345678" as any,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const adminInfo = await api.functional.shoppingMall.auth.admin.login(
    adminConnection,
    {
      body: {
        email: `admin+test${RandomGenerator.alphaNumeric(6)}@test.com`,
        password: "12345678" as any,
      } satisfies IShoppingMallAdmin.ILogin,
    },
  );
  typia.assert(adminInfo);
  // Create test seller and product variant
  const sellerConnection: api.IConnection = { host: connection.host };
  // Since seller API is not available, skip seller-related operations
  // For testing inventory history retrieval, we can use admin operations instead
  // Create a product directly with admin privileges if needed
  // Since we only need to test the inventory history retrieval endpoint,
  // we can directly call the admin endpoint with a mock variant ID
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // Test inventory history retrieval with various filters
  // Test 1: Get all inventory history with pagination
  const allHistory =
    await api.functional.shoppingMall.admin.inventory_history.variants.index(
      adminConnection,
      {
        variantId: variantId,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(allHistory);
  TestValidator.equals("pagination exists", allHistory.pagination.current, 1);
  TestValidator.equals("pagination limit", allHistory.pagination.limit, 10);
  TestValidator.predicate("has records", allHistory.pagination.records >= 0);
  // Test 2: Filter by reason codes
  const orderHistory =
    await api.functional.shoppingMall.admin.inventory_history.variants.index(
      adminConnection,
      {
        variantId: variantId,
        body: {
          reason: ["order"],
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(orderHistory);
  // Test 3: Filter by date range
  const startDate = new Date().toISOString();
  await new Promise((resolve) => setTimeout(resolve, 100)); // Wait to ensure different timestamps
  const dateRangeHistory =
    await api.functional.shoppingMall.admin.inventory_history.variants.index(
      adminConnection,
      {
        variantId: variantId,
        body: {
          created_at_range: [startDate, new Date().toISOString()],
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(dateRangeHistory);
  // Test 4: Sort by created_at ascending
  const ascendingHistory =
    await api.functional.shoppingMall.admin.inventory_history.variants.index(
      adminConnection,
      {
        variantId: variantId,
        body: {
          sort_by: "created_at",
          sort_order: "asc",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(ascendingHistory);
  // Test 5: Sort by created_at descending
  const descendingHistory =
    await api.functional.shoppingMall.admin.inventory_history.variants.index(
      adminConnection,
      {
        variantId: variantId,
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(descendingHistory);
  // Test 6: Verify inventory history structure
  const inventoryHistory =
    await api.functional.shoppingMall.admin.inventory_history.variants.index(
      adminConnection,
      {
        variantId: variantId,
        body: {
          page: 1,
          limit: 1,
        },
      },
    );
  typia.assert(inventoryHistory);
  if (inventoryHistory.data.length > 0) {
    const historyRecord = inventoryHistory.data[0];
    // Verify required fields exist
    TestValidator.equals("has id", typeof historyRecord.id, "string");
    TestValidator.equals(
      "has quantity_change",
      typeof historyRecord.quantity_change,
      "number",
    );
    TestValidator.equals("has reason", typeof historyRecord.reason, "string");
    TestValidator.equals(
      "has created_at",
      typeof historyRecord.created_at,
      "string",
    );
    TestValidator.equals(
      "has product_variant_id",
      typeof historyRecord.shopping_mall_product_variant_id,
      "string",
    );
    TestValidator.equals(
      "has order_item_id",
      typeof historyRecord.shopping_mall_order_item_id === "string" ||
        historyRecord.shopping_mall_order_item_id === null,
      true,
    );
    TestValidator.equals(
      "has seller_id",
      typeof historyRecord.shopping_mall_seller_id === "string" ||
        historyRecord.shopping_mall_seller_id === null,
      true,
    );
  }
  // Test 7: Pagination validation
  const page1 =
    await api.functional.shoppingMall.admin.inventory_history.variants.index(
      adminConnection,
      {
        variantId: variantId,
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(page1);
  const page2 =
    await api.functional.shoppingMall.admin.inventory_history.variants.index(
      adminConnection,
      {
        variantId: variantId,
        body: {
          page: 2,
          limit: 2,
        },
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 1 records", page1.data.length, 2);
  TestValidator.equals("page 2 records", page2.data.length, 2);
  TestValidator.equals(
    "pagination records count",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals("pagination limit", page1.pagination.limit, 2);
  TestValidator.equals(
    "pagination current page 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination current page 2",
    page2.pagination.current,
    2,
  );
}
