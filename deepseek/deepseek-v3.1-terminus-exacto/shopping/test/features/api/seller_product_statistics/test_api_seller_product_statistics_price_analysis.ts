import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductStatistics";
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
 * Test product statistics with price range filtering and revenue metrics.
 * Seller creates products across different price points, then retrieves
 * statistics focused on pricing analysis and revenue performance. Validate that
 * statistics include average price calculations, price range distribution, and
 * revenue metrics. Test with minimum and maximum price filters to analyze
 * specific price segments.
 */
export async function test_api_seller_product_statistics_price_analysis(
  connection: api.IConnection,
) {
  // 1. Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "password123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: undefined,
      ip: undefined,
      href: "https://shoppingmall.example.com/seller/join",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Create a sample category for products
  const sampleCategory: IShoppingMallCategory.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: "Electronics",
    description: "Electronic products and gadgets",
    display_order: 1,
    active: true,
    parent_id: typia.random<string & tags.Format<"uuid">>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    parent: undefined,
  };

  // 2. Create multiple products with varying price points
  const products: IShoppingMallProduct[] = [];
  const pricePoints = [50, 200, 500, 1000, 2000]; // Low to high prices

  for (const price of pricePoints) {
    const product = await api.functional.shoppingMall.seller.products.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          sku: RandomGenerator.alphaNumeric(8),
          price: price,
          compare_price: price * 1.2, // 20% higher compare price
          cost_price: price * 0.6, // 40% margin
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          status: "active",
          condition: "new",
          weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<5>>(),
          dimensions: `${typia.random<number & tags.Minimum<5> & tags.Maximum<20>>()}x${typia.random<number & tags.Minimum<5> & tags.Maximum<20>>()}x${typia.random<number & tags.Minimum<5> & tags.Maximum<20>>()}`,
          category: sampleCategory,
          seller: {
            id: seller.id,
            business_name: seller.business_name,
            contact_person: seller.contact_person,
            email: seller.email,
            status: seller.status,
          } satisfies IShoppingMallSeller.ISummary,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
    typia.assert(product);
    products.push(product);
  }

  // 3. Test product statistics with different price range filters

  // Test 1: Full price range (no filters)
  const fullStats =
    await api.functional.shoppingMall.seller.statistics.products.index(
      connection,
      {
        body: {
          date_range: {
            start: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000,
            ).toISOString(), // Last 30 days
            end: new Date().toISOString(),
          } satisfies IDateRange,
          group_by: ["price_segment", "category"],
          filters: undefined,
          metrics: ["price_analysis", "revenue", "inventory_turnover"],
          pagination: {
            current: 1,
            limit: 10,
            records: 0,
            pages: 0,
          } satisfies IPage.IPagination,
        } satisfies IShoppingMallProductStatistics.IRequest,
      },
    );
  typia.assert(fullStats);

  // Validate full statistics
  TestValidator.predicate(
    "full statistics should contain products",
    fullStats.data.length > 0,
  );
  TestValidator.predicate(
    "should have total products count",
    fullStats.data[0].total_products > 0,
  );
  TestValidator.predicate(
    "should have active products",
    fullStats.data[0].active_products > 0,
  );

  // Test 2: Low price range filter (under 100)
  const lowPriceStats =
    await api.functional.shoppingMall.seller.statistics.products.index(
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
            min_price: undefined,
            max_price: 100,
          } satisfies IShoppingMallProductFilters,
          metrics: ["price_analysis"],
          pagination: {
            current: 1,
            limit: 10,
            records: 0,
            pages: 0,
          } satisfies IPage.IPagination,
        } satisfies IShoppingMallProductStatistics.IRequest,
      },
    );
  typia.assert(lowPriceStats);

  // Test 3: Medium price range filter (100-500)
  const mediumPriceStats =
    await api.functional.shoppingMall.seller.statistics.products.index(
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
            min_price: 100,
            max_price: 500,
          } satisfies IShoppingMallProductFilters,
          metrics: ["price_analysis", "revenue"],
          pagination: {
            current: 1,
            limit: 10,
            records: 0,
            pages: 0,
          } satisfies IPage.IPagination,
        } satisfies IShoppingMallProductStatistics.IRequest,
      },
    );
  typia.assert(mediumPriceStats);

  // Test 4: High price range filter (over 500)
  const highPriceStats =
    await api.functional.shoppingMall.seller.statistics.products.index(
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
            min_price: 500,
            max_price: undefined,
          } satisfies IShoppingMallProductFilters,
          metrics: ["price_analysis", "revenue", "performance"],
          pagination: {
            current: 1,
            limit: 10,
            records: 0,
            pages: 0,
          } satisfies IPage.IPagination,
        } satisfies IShoppingMallProductStatistics.IRequest,
      },
    );
  typia.assert(highPriceStats);

  // 4. Validate price analysis metrics
  if (fullStats.data[0].price_range) {
    TestValidator.predicate(
      "price range should have min price",
      fullStats.data[0].price_range.min_price >= 0,
    );
    TestValidator.predicate(
      "price range should have max price",
      fullStats.data[0].price_range.max_price >=
        fullStats.data[0].price_range.min_price,
    );
    TestValidator.predicate(
      "price range should have median price",
      fullStats.data[0].price_range.median_price >=
        fullStats.data[0].price_range.min_price &&
        fullStats.data[0].price_range.median_price <=
          fullStats.data[0].price_range.max_price,
    );
  }

  // Validate average price calculation
  TestValidator.predicate(
    "average price should be calculated",
    fullStats.data[0].average_price > 0,
  );

  // 5. Compare statistics across different price segments
  TestValidator.predicate(
    "low price stats should have data",
    lowPriceStats.data.length > 0,
  );
  TestValidator.predicate(
    "medium price stats should have data",
    mediumPriceStats.data.length > 0,
  );
  TestValidator.predicate(
    "high price stats should have data",
    highPriceStats.data.length > 0,
  );

  // Validate that filtered statistics reflect the price constraints
  if (lowPriceStats.data[0].price_range) {
    TestValidator.predicate(
      "low price range max should be <= 100",
      lowPriceStats.data[0].price_range.max_price <= 100,
    );
  }

  if (mediumPriceStats.data[0].price_range) {
    TestValidator.predicate(
      "medium price range min should be >= 100",
      mediumPriceStats.data[0].price_range.min_price >= 100,
    );
    TestValidator.predicate(
      "medium price range max should be <= 500",
      mediumPriceStats.data[0].price_range.max_price <= 500,
    );
  }

  if (highPriceStats.data[0].price_range) {
    TestValidator.predicate(
      "high price range min should be >= 500",
      highPriceStats.data[0].price_range.min_price >= 500,
    );
  }

  // 6. Validate inventory metrics
  TestValidator.predicate(
    "should track low stock products",
    fullStats.data[0].low_stock_products >= 0,
  );
  TestValidator.predicate(
    "should track out of stock products",
    fullStats.data[0].out_of_stock_products >= 0,
  );

  // Validate category distribution
  if (fullStats.data[0].category_distribution) {
    TestValidator.predicate(
      "category distribution should have entries",
      fullStats.data[0].category_distribution.length > 0,
    );
    TestValidator.predicate(
      "category distribution should have valid percentages",
      fullStats.data[0].category_distribution.every(
        (dist) => dist.percentage >= 0 && dist.percentage <= 100,
      ),
    );
  }

  // Validate seller distribution
  if (fullStats.data[0].seller_distribution) {
    TestValidator.predicate(
      "seller distribution should have entries",
      fullStats.data[0].seller_distribution.length > 0,
    );
    TestValidator.predicate(
      "seller distribution should have valid active ratios",
      fullStats.data[0].seller_distribution.every(
        (dist) => dist.activeRatio >= 0 && dist.activeRatio <= 100,
      ),
    );
  }
}
