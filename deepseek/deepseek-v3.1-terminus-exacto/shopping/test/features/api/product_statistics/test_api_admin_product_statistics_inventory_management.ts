import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductStatistics";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryDistribution";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCondition";
import type { IShoppingMallProductFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductFilters";
import type { IShoppingMallProductPriceRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPriceRange";
import type { IShoppingMallProductStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductStatistics";
import type { IShoppingMallProductStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductStatus";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDistribution";

/**
 * Comprehensive product statistics validation focused on inventory management
 * and stock level analysis for administrative oversight.
 *
 * This test creates a multi-seller marketplace environment with diverse product
 * inventory statuses to validate statistical reporting accuracy. Administrators
 * can monitor inventory health metrics including low stock alerts, out-of-stock
 * products, and inventory value calculations across the platform.
 *
 * Test workflow:
 *
 * 1. Administrator authentication setup
 * 2. Multiple seller account creation
 * 3. Product creation with varied inventory levels
 * 4. Inventory-focused statistics API testing
 * 5. Statistical validation and business logic verification
 */
export async function test_api_admin_product_statistics_inventory_management(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for system-wide access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({
          statistics: ["read", "export"],
          products: ["read", "manage"],
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create multiple sellers with diverse product catalogs
  const sellers: IShoppingMallSeller.IAuthorized[] = [];
  const sellerProducts: IShoppingMallProduct[] = [];

  // Create 3 sellers with different product inventories
  for (let i = 0; i < 3; i++) {
    const sellerEmail = typia.random<string & tags.Format<"email">>();
    const sellerPassword = "SellerPassword123!";

    const seller: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.join(connection, {
        body: {
          email: sellerEmail,
          password: sellerPassword,
          business_name: `Seller ${i + 1} Inc.`,
          contact_person: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          business_address: `${RandomGenerator.paragraph({ sentences: 3 })}, ${RandomGenerator.name(1)}`,
          tax_id: `TAX${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}`,
          href: "https://shoppingmall.example.com/dashboard",
          referrer: "https://shoppingmall.example.com",
        } satisfies IShoppingMallSeller.ICreate,
      });
    typia.assert(seller);
    sellers.push(seller);

    // Switch to seller context
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: "https://shoppingmall.example.com/dashboard",
        referrer: "https://shoppingmall.example.com",
      } satisfies IShoppingMallSeller.ILogin,
    });

    // Create products with different inventory statuses for this seller
    const productStatuses: Array<{
      stock_quantity: number;
      status: string;
      condition: string;
      price: number;
    }> = [
      { stock_quantity: 100, status: "active", condition: "new", price: 2999 }, // In stock
      { stock_quantity: 5, status: "active", condition: "new", price: 4999 }, // Low stock
      { stock_quantity: 0, status: "active", condition: "used", price: 1999 }, // Out of stock
      {
        stock_quantity: -10,
        status: "active",
        condition: "refurbished",
        price: 1499,
      }, // Backordered
      { stock_quantity: 50, status: "inactive", condition: "new", price: 3999 }, // Inactive but has stock
    ];

    for (const productStatus of productStatuses) {
      const product: IShoppingMallProduct =
        await api.functional.shoppingMall.seller.products.create(connection, {
          body: {
            name: RandomGenerator.paragraph({ sentences: 3 }),
            description: RandomGenerator.content({ paragraphs: 2 }),
            sku: `SKU-${typia.random<string & tags.Format<"uuid">>()}`,
            price: productStatus.price,
            compare_price: productStatus.price * 1.2,
            cost_price: productStatus.price * 0.6,
            stock_quantity: productStatus.stock_quantity,
            status: productStatus.status,
            condition: productStatus.condition,
            weight: typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<100> &
                tags.Maximum<5000>
            >(),
            dimensions: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>>()}x${typia.random<number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>>()}x${typia.random<number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>>()}`,
            category: {
              id: typia.random<string & tags.Format<"uuid">>(),
              name: "Electronics",
              description: "Electronic devices and accessories",
              display_order: 1,
              active: true,
              parent_id: typia.random<string & tags.Format<"uuid">>(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              parent: undefined,
            } satisfies IShoppingMallCategory.ISummary,
            seller: {
              id: seller.id,
              business_name: seller.business_name,
              contact_person: seller.contact_person,
              email: seller.email,
              status: seller.status,
            } satisfies IShoppingMallSeller.ISummary,
          } satisfies IShoppingMallProduct.ICreate,
        });
      typia.assert(product);
      sellerProducts.push(product);
    }
  }

  // Step 3: Switch back to administrator context for statistics testing
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shoppingmall.example.com/admin",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 4: Test product statistics with inventory-focused filtering
  const statisticsRequest: IShoppingMallProductStatistics.IRequest = {
    date_range: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
      end: new Date().toISOString(),
    } satisfies IDateRange,
    group_by: ["category", "seller", "inventory_level"],
    filters: {
      inventory_status: [
        "in_stock",
        "low_stock",
        "out_of_stock",
        "backordered",
      ] as IShoppingMallInventoryStatus[],
      status: ["active", "inactive"] as IShoppingMallProductStatus[],
      condition: [
        "new",
        "used",
        "refurbished",
      ] as IShoppingMallProductCondition[],
    } satisfies IShoppingMallProductFilters,
    metrics: [
      "total_sales",
      "revenue",
      "inventory_turnover",
      "popularity",
      "price_analysis",
      "performance",
    ],
    pagination: {
      current: 1,
      limit: 50,
      records: 0,
      pages: 0,
    } satisfies IPage.IPagination,
  };

  const statistics: IPageIShoppingMallProductStatistics =
    await api.functional.shoppingMall.admin.statistics.products.index(
      connection,
      {
        body: statisticsRequest,
      },
    );
  typia.assert(statistics);

  // Step 5: Validate statistical results
  TestValidator.predicate(
    "statistics should contain data",
    statistics.data.length > 0,
  );

  TestValidator.predicate(
    "pagination should be properly configured",
    statistics.pagination.current === 1 && statistics.pagination.limit === 50,
  );

  // Validate inventory-specific metrics
  const totalStats = statistics.data[0];
  if (totalStats) {
    TestValidator.predicate(
      "total products count should be positive",
      totalStats.total_products > 0,
    );

    TestValidator.predicate(
      "active products count should be less than or equal to total",
      totalStats.active_products <= totalStats.total_products,
    );

    TestValidator.predicate(
      "low stock products count should be reasonable",
      totalStats.low_stock_products >= 0 &&
        totalStats.low_stock_products <= totalStats.total_products,
    );

    TestValidator.predicate(
      "out of stock products count should be reasonable",
      totalStats.out_of_stock_products >= 0 &&
        totalStats.out_of_stock_products <= totalStats.total_products,
    );

    TestValidator.predicate(
      "average price should be positive",
      totalStats.average_price > 0,
    );

    if (totalStats.price_range) {
      TestValidator.predicate(
        "price range min should be less than or equal to max",
        totalStats.price_range.min_price <= totalStats.price_range.max_price,
      );

      TestValidator.predicate(
        "median price should be between min and max",
        totalStats.price_range.min_price <=
          totalStats.price_range.median_price &&
          totalStats.price_range.median_price <=
            totalStats.price_range.max_price,
      );
    }

    // Validate category distribution
    if (totalStats.category_distribution) {
      TestValidator.predicate(
        "category distribution should have valid percentages",
        totalStats.category_distribution.every(
          (cat) => cat.percentage >= 0 && cat.percentage <= 100,
        ),
      );
    }

    // Validate seller distribution
    if (totalStats.seller_distribution) {
      TestValidator.predicate(
        "seller distribution should have valid active ratios",
        totalStats.seller_distribution.every(
          (seller) => seller.activeRatio >= 0 && seller.activeRatio <= 100,
        ),
      );
    }
  }

  // Step 6: Test specific inventory status filtering
  const lowStockRequest: IShoppingMallProductStatistics.IRequest = {
    ...statisticsRequest,
    filters: {
      ...statisticsRequest.filters,
      inventory_status: ["low_stock"] as IShoppingMallInventoryStatus[],
    },
  };

  const lowStockStats: IPageIShoppingMallProductStatistics =
    await api.functional.shoppingMall.admin.statistics.products.index(
      connection,
      {
        body: lowStockRequest,
      },
    );
  typia.assert(lowStockStats);

  // Validate low stock filtering works correctly
  if (lowStockStats.data.length > 0) {
    const lowStockData = lowStockStats.data[0];
    TestValidator.predicate(
      "low stock products should be reported when filtered",
      lowStockData.low_stock_products > 0,
    );
  }

  // Step 7: Test out of stock filtering
  const outOfStockRequest: IShoppingMallProductStatistics.IRequest = {
    ...statisticsRequest,
    filters: {
      ...statisticsRequest.filters,
      inventory_status: ["out_of_stock"] as IShoppingMallInventoryStatus[],
    },
  };

  const outOfStockStats: IPageIShoppingMallProductStatistics =
    await api.functional.shoppingMall.admin.statistics.products.index(
      connection,
      {
        body: outOfStockRequest,
      },
    );
  typia.assert(outOfStockStats);

  // Validate out of stock filtering
  if (outOfStockStats.data.length > 0) {
    const outOfStockData = outOfStockStats.data[0];
    TestValidator.predicate(
      "out of stock products should be reported when filtered",
      outOfStockData.out_of_stock_products > 0,
    );
  }

  // Final validation: Ensure statistics help identify supply chain issues
  TestValidator.predicate(
    "statistics should provide actionable inventory insights",
    statistics.data.some(
      (stat) => stat.low_stock_products > 0 || stat.out_of_stock_products > 0,
    ),
  );
}
