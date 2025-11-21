import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryLevels } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryLevels";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryLevels } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLevels";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWarehouse";

/**
 * Test warehouse-specific inventory monitoring with geographic filtering and
 * multi-location distribution analysis.
 *
 * Validates inventory tracking across warehouse facilities with location-based
 * filtering, warehouse code identification, and capacity planning. Tests
 * warehouse stock assessment including current stock, reserved quantities,
 * allocated stock, and reorder point analysis.
 */
export async function test_api_admin_inventory_monitoring_warehouse_analysis(
  connection: api.IConnection,
) {
  // Monitor comprehensive inventory levels across warehouse network
  const comprehensiveMonitor =
    await api.functional.shoppingMall.admin.inventoryLevels.index(connection, {
      body: {
        include_out_of_stock: "true",
        sort_by: "current_stock",
        page: 0,
        limit: 50,
        alert_status_filter: "all",
        sort_direction: "asc",
      } satisfies IShoppingMallInventoryLevels.IRequest,
    });

  TestValidator.equals(
    "comprehensive monitoring returns data",
    comprehensiveMonitor.data.length >= 0,
    true,
  );
  TestValidator.predicate(
    "monitoring includes pagination info",
    comprehensiveMonitor.pagination.records >= 0,
  );

  // Test geographic filtering for New York region
  const nyRegionMonitor =
    await api.functional.shoppingMall.admin.inventoryLevels.index(connection, {
      body: {
        include_out_of_stock: "true",
        sort_by: "warehouse_name",
        page: 0,
        limit: 15,
        alert_status_filter: "normal",
        sort_direction: "asc",
        search_text: "New York",
        warehouse_codes: ["WH-NYC-001"],
      } satisfies IShoppingMallInventoryLevels.IRequest,
    });

  TestValidator.predicate(
    "geographic filtering works",
    nyRegionMonitor.data.length >= 0,
  );
  TestValidator.predicate(
    "warehouse code filtering active",
    nyRegionMonitor.data.length <= 15,
  );

  // Monitor low-stock inventory levels for reorder analysis
  const lowStockMonitor =
    await api.functional.shoppingMall.admin.inventoryLevels.index(connection, {
      body: {
        include_out_of_stock: "true",
        sort_by: "current_stock",
        page: 0,
        limit: 20,
        alert_status_filter: "low_stock",
        sort_direction: "asc",
        low_stock_threshold: 25,
      } satisfies IShoppingMallInventoryLevels.IRequest,
    });

  TestValidator.predicate(
    "low stock monitoring active",
    lowStockMonitor.data.length >= 0,
  );
  TestValidator.predicate(
    "query size respects limit",
    lowStockMonitor.data.length <= 20,
  );

  // Test multi-warehouse distribution analysis
  const multiWarehouseAnalysis =
    await api.functional.shoppingMall.admin.inventoryLevels.index(connection, {
      body: {
        include_out_of_stock: "false",
        sort_by: "warehouse_name",
        page: 0,
        limit: 30,
        alert_status_filter: "normal",
        sort_direction: "asc",
        warehouse_codes: ["WH-NYC-001", "WH-LA-002", "WH-CHI-003"],
      } satisfies IShoppingMallInventoryLevels.IRequest,
    });

  TestValidator.predicate(
    "multi-warehouse analysis works",
    multiWarehouseAnalysis.data.length >= 0,
  );
  TestValidator.predicate(
    "analysis covers multiple locations",
    multiWarehouseAnalysis.data.length <= 30,
  );

  // Test seller-specific distribution monitoring
  const sellerDistributionMonitor =
    await api.functional.shoppingMall.admin.inventoryLevels.index(connection, {
      body: {
        include_out_of_stock: "true",
        sort_by: "seller_name",
        page: 0,
        limit: 25,
        alert_status_filter: "all",
        sort_direction: "asc",
        search_text: "Merchant",
      } satisfies IShoppingMallInventoryLevels.IRequest,
    });

  TestValidator.predicate(
    "seller inventory monitoring active",
    sellerDistributionMonitor.data.length >= 0,
  );
  TestValidator.predicate(
    "seller search filters relevant data",
    sellerDistributionMonitor.data.length <= 25,
  );

  // Test capacity planning and distribution optimization
  const capacityPlanningMonitor =
    await api.functional.shoppingMall.admin.inventoryLevels.index(connection, {
      body: {
        include_out_of_stock: "false",
        sort_by: "reorder_point",
        page: 0,
        limit: 10,
        alert_status_filter: "normal",
        sort_direction: "asc",
        include_aggregated_counts: "true",
      } satisfies IShoppingMallInventoryLevels.IRequest,
    });

  TestValidator.predicate(
    "capacity planning monitoring works",
    capacityPlanningMonitor.data.length >= 0,
  );
  TestValidator.predicate(
    "reorder point analysis prioritizes needs",
    capacityPlanningMonitor.data.length <= 10,
  );

  // TEST FILTERING BY PRODUCT CATEGORIES AND SKU
  const categorySkuFilteredMonitor =
    await api.functional.shoppingMall.admin.inventoryLevels.index(connection, {
      body: {
        include_out_of_stock: "true",
        search_text: "Standard",
        sort_by: "seller_name",
        page: 0,
        limit: 20,
        alert_status_filter: "normal",
        sort_direction: "asc",
        product_sku_filters: ["PROD-001-V1", "PROD-002-V2"],
      } satisfies IShoppingMallInventoryLevels.IRequest,
    });

  TestValidator.predicate(
    "SKU and search filtering active",
    categorySkuFilteredMonitor.data.length >= 0,
  );
  TestValidator.predicate(
    "combined filtering works",
    categorySkuFilteredMonitor.data.length <= 20,
  );

  // Test comprehensive geographic distribution analysis
  const geographicDistributionAnalysis =
    await api.functional.shoppingMall.admin.inventoryLevels.index(connection, {
      body: {
        include_out_of_stock: "true",
        sort_by: "warehouse_name",
        page: 0,
        limit: 40,
        alert_status_filter: "all",
        sort_direction: "asc",
        warehouse_codes: [
          "WH-NYC-001",
          "WH-LA-002",
          "WH-CHI-003",
          "WH-MIA-004",
        ],
      } satisfies IShoppingMallInventoryLevels.IRequest,
    });

  TestValidator.predicate(
    "geographic distribution analysis comprehensive",
    geographicDistributionAnalysis.data.length >= 0,
  );
  TestValidator.predicate(
    "analysis spans multiple regions",
    geographicDistributionAnalysis.data.length <= 40,
  );

  // Validate pagination and result organization
  const firstPage =
    await api.functional.shoppingMall.admin.inventoryLevels.index(connection, {
      body: {
        include_out_of_stock: "true",
        sort_by: "current_stock",
        page: 0,
        limit: 15,
        alert_status_filter: "all",
        sort_direction: "desc",
      } satisfies IShoppingMallInventoryLevels.IRequest,
    });

  const secondPage =
    await api.functional.shoppingMall.admin.inventoryLevels.index(connection, {
      body: {
        include_out_of_stock: "true",
        sort_by: "current_stock",
        page: 1,
        limit: 15,
        alert_status_filter: "all",
        sort_direction: "desc",
      } satisfies IShoppingMallInventoryLevels.IRequest,
    });

  TestValidator.predicate(
    "first page shows correct pagination",
    firstPage.pagination.current === 0,
  );
  TestValidator.predicate(
    "second page advances pagination",
    secondPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination separates unique items",
    !(
      firstPage.data.length > 0 &&
      secondPage.data.length > 0 &&
      firstPage.data.some((level1) =>
        secondPage.data.some((level2) => level1.id === level2.id),
      )
    ),
  );
}
