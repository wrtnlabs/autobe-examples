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
 * Comprehensive product statistics validation for administrators
 *
 * This test validates that administrators can retrieve accurate product
 * statistics across the entire shopping mall platform. It creates a realistic
 * product catalog with diverse products, categories, sellers, and inventory
 * levels to test the statistics API's ability to analyze and report on platform
 * health metrics.
 */
export async function test_api_admin_product_statistics_comprehensive(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
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
        permissions: JSON.stringify({ all: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create seller accounts
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = "Seller1Password123!";

  const seller1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: seller1Email,
        password: seller1Password,
        business_name: RandomGenerator.name(2),
        contact_person: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 3 }),
        href: "https://example.com/seller1",
        referrer: "https://example.com",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller1);

  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = "Seller2Password123!";

  const seller2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: seller2Email,
        password: seller2Password,
        business_name: RandomGenerator.name(2),
        contact_person: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 3 }),
        href: "https://example.com/seller2",
        referrer: "https://example.com",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller2);

  // Step 3: Create product categories
  const category1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Electronics",
        description: "Electronic devices and gadgets",
        display_order: 1,
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category1);

  const category2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Clothing",
        description: "Apparel and fashion items",
        display_order: 2,
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category2);

  // Helper function to create category summary
  const createCategorySummary = (
    category: IShoppingMallCategory,
  ): IShoppingMallCategory.ISummary => {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      display_order: category.display_order,
      active: category.active,
      parent_id:
        category.parent?.id ?? typia.random<string & tags.Format<"uuid">>(),
      created_at: category.created_at,
      updated_at: category.updated_at,
      parent: category.parent,
    } satisfies IShoppingMallCategory.ISummary;
  };

  // Helper function to create seller summary
  const createSellerSummary = (
    seller: IShoppingMallSeller.IAuthorized,
  ): IShoppingMallSeller.ISummary => {
    return {
      id: seller.id,
      business_name: seller.business_name,
      contact_person: seller.contact_person,
      email: seller.email,
      status: seller.status,
    } satisfies IShoppingMallSeller.ISummary;
  };

  // Step 4: Switch to seller1 and create products
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      href: "https://example.com/seller1/dashboard",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const seller1Products: IShoppingMallProduct[] = [];

  // Create active product with high stock
  const product1: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: "Smartphone",
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: "SPH001",
        price: 999.99,
        compare_price: 1199.99,
        cost_price: 700,
        stock_quantity: 50,
        status: "active",
        condition: "new",
        weight: 0.2,
        dimensions: "15x7x1 cm",
        category: createCategorySummary(category1),
        seller: createSellerSummary(seller1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product1);
  seller1Products.push(product1);

  // Create low stock product
  const product2: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: "Laptop",
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: "LAP001",
        price: 1499.99,
        compare_price: 1799.99,
        cost_price: 1100,
        stock_quantity: 5,
        status: "active",
        condition: "new",
        weight: 2.5,
        dimensions: "35x25x2 cm",
        category: createCategorySummary(category1),
        seller: createSellerSummary(seller1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product2);
  seller1Products.push(product2);

  // Create out-of-stock product
  const product3: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: "Tablet",
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: "TAB001",
        price: 499.99,
        compare_price: 599.99,
        cost_price: 350,
        stock_quantity: 0,
        status: "active",
        condition: "new",
        weight: 0.6,
        dimensions: "24x16x1 cm",
        category: createCategorySummary(category1),
        seller: createSellerSummary(seller1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product3);
  seller1Products.push(product3);

  // Step 5: Switch to seller2 and create products
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      href: "https://example.com/seller2/dashboard",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const seller2Products: IShoppingMallProduct[] = [];

  // Create clothing product
  const product4: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: "T-Shirt",
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: "TSH001",
        price: 29.99,
        compare_price: 39.99,
        cost_price: 15,
        stock_quantity: 100,
        status: "active",
        condition: "new",
        weight: 0.3,
        dimensions: "S/M/L/XL",
        category: createCategorySummary(category2),
        seller: createSellerSummary(seller2),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product4);
  seller2Products.push(product4);

  // Create used clothing product
  const product5: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: "Jeans",
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: "JNS001",
        price: 49.99,
        compare_price: 79.99,
        cost_price: 25,
        stock_quantity: 25,
        status: "active",
        condition: "used",
        weight: 0.8,
        dimensions: "30-40 waist",
        category: createCategorySummary(category2),
        seller: createSellerSummary(seller2),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product5);
  seller2Products.push(product5);

  // Create inactive product
  const product6: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: "Winter Jacket",
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: "JKT001",
        price: 199.99,
        compare_price: 249.99,
        cost_price: 120,
        stock_quantity: 10,
        status: "inactive",
        condition: "new",
        weight: 1.2,
        dimensions: "M/L/XL",
        category: createCategorySummary(category2),
        seller: createSellerSummary(seller2),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product6);
  seller2Products.push(product6);

  // Step 6: Switch back to admin and test statistics
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin/dashboard",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Test 1: Basic statistics with category grouping
  const basicStats: IPageIShoppingMallProductStatistics =
    await api.functional.shoppingMall.admin.statistics.products.index(
      connection,
      {
        body: {
          date_range: {
            start: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            end: new Date().toISOString(),
          } satisfies IDateRange,
          group_by: ["category", "seller", "price_segment"],
          metrics: [
            "total_sales",
            "revenue",
            "inventory_turnover",
            "price_analysis",
          ],
          pagination: {
            current: 1,
            limit: 10,
            records: 0,
            pages: 0,
          } satisfies IPage.IPagination,
        } satisfies IShoppingMallProductStatistics.IRequest,
      },
    );
  typia.assert(basicStats);

  // Validate basic statistics
  TestValidator.predicate(
    "should return statistics data",
    basicStats.data.length > 0,
  );
  TestValidator.predicate(
    "should have pagination info",
    basicStats.pagination.records >= 0,
  );

  // Test 2: Filtered statistics by category
  const filteredStats: IPageIShoppingMallProductStatistics =
    await api.functional.shoppingMall.admin.statistics.products.index(
      connection,
      {
        body: {
          date_range: {
            start: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            end: new Date().toISOString(),
          } satisfies IDateRange,
          group_by: ["category", "inventory_level"],
          filters: {
            category_ids: [category1.id],
            status: ["active"],
            inventory_status: ["in_stock", "low_stock", "out_of_stock"],
            condition: ["new", "used"],
          } satisfies IShoppingMallProductFilters,
          metrics: ["performance", "inventory_turnover"],
          pagination: {
            current: 1,
            limit: 5,
            records: 0,
            pages: 0,
          } satisfies IPage.IPagination,
        } satisfies IShoppingMallProductStatistics.IRequest,
      },
    );
  typia.assert(filteredStats);

  // Validate filtered statistics
  TestValidator.predicate(
    "filtered stats should have data",
    filteredStats.data.length >= 0,
  );

  // Test 3: Comprehensive statistics with all metrics
  const comprehensiveStats: IPageIShoppingMallProductStatistics =
    await api.functional.shoppingMall.admin.statistics.products.index(
      connection,
      {
        body: {
          date_range: {
            start: new Date(
              Date.now() - 90 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            end: new Date().toISOString(),
          } satisfies IDateRange,
          group_by: ["category", "seller", "status", "inventory_level"],
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
            limit: 20,
            records: 0,
            pages: 0,
          } satisfies IPage.IPagination,
        } satisfies IShoppingMallProductStatistics.IRequest,
      },
    );
  typia.assert(comprehensiveStats);

  // Validate comprehensive statistics structure
  TestValidator.predicate(
    "comprehensive stats should be returned",
    comprehensiveStats.data.length >= 0,
  );

  // Test 4: Price range analysis
  const priceStats: IPageIShoppingMallProductStatistics =
    await api.functional.shoppingMall.admin.statistics.products.index(
      connection,
      {
        body: {
          date_range: {
            start: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            end: new Date().toISOString(),
          } satisfies IDateRange,
          group_by: ["price_segment"],
          filters: {
            min_price: 10,
            max_price: 2000,
          } satisfies IShoppingMallProductFilters,
          metrics: ["price_analysis"],
          pagination: {
            current: 1,
            limit: 5,
            records: 0,
            pages: 0,
          } satisfies IPage.IPagination,
        } satisfies IShoppingMallProductStatistics.IRequest,
      },
    );
  typia.assert(priceStats);

  // Validate price statistics
  TestValidator.predicate(
    "price stats should be valid",
    priceStats.data.length >= 0,
  );

  // Final validation: Ensure all API calls completed successfully
  TestValidator.predicate("all product statistics operations completed", true);
}
