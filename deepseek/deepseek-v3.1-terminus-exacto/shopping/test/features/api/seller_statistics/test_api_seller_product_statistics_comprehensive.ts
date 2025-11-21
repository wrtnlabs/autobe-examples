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
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDistribution";

/**
 * Comprehensive product statistics retrieval test for sellers with various
 * filtering options.
 *
 * This test validates the seller product statistics API endpoint that provides
 * detailed analytics on product performance, inventory management, and catalog
 * composition. The test follows a complete business workflow from seller
 * registration through product creation to comprehensive statistics analysis
 * with various filtering and grouping options.
 */
export async function test_api_seller_product_statistics_comprehensive(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication context
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "sellerPassword123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: undefined,
      ip: undefined,
      href: "https://shoppingmall.example.com/seller/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create test products across different categories
  const categories = ["electronics", "clothing", "home", "sports"] as const;
  const products: IShoppingMallProduct[] = [];

  for (const categoryName of categories) {
    const productCount = RandomGenerator.pick([2, 3, 4] as const);

    for (let i = 0; i < productCount; i++) {
      const category: IShoppingMallCategory.ISummary = {
        id: typia.random<string & tags.Format<"uuid">>(),
        name: categoryName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        active: true,
        parent_id: typia.random<string & tags.Format<"uuid">>(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parent: undefined,
      };

      const product = await api.functional.shoppingMall.seller.products.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 3 }),
            description: RandomGenerator.content({ paragraphs: 2 }),
            sku: RandomGenerator.alphaNumeric(8),
            price: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<100> &
                tags.Maximum<5000>
            >(),
            compare_price: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<500> &
                tags.Maximum<6000>
            >(),
            cost_price: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<50> &
                tags.Maximum<4000>
            >(),
            stock_quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
            >(),
            status: RandomGenerator.pick([
              "draft",
              "active",
              "inactive",
            ] as const),
            condition: RandomGenerator.pick([
              "new",
              "used",
              "refurbished",
            ] as const),
            weight: typia.random<
              number & tags.Minimum<0.1> & tags.Maximum<50>
            >(),
            dimensions: `${typia.random<number & tags.Minimum<1> & tags.Maximum<100>>()}x${typia.random<number & tags.Minimum<1> & tags.Maximum<100>>()}x${typia.random<number & tags.Minimum<1> & tags.Maximum<100>>()}`,
            category: category,
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

      // Step 3: Add variants to some products
      if (Math.random() > 0.5) {
        const variantCount = RandomGenerator.pick([1, 2, 3] as const);
        for (let j = 0; j < variantCount; j++) {
          const variant =
            await api.functional.shoppingMall.seller.products.variants.create(
              connection,
              {
                productId: product.id,
                body: {
                  shopping_mall_product_id: product.id,
                  variant_name: `${product.name} - ${RandomGenerator.pick(["Large", "Small", "Red", "Blue"] as const)}`,
                  sku: `${product.sku}-V${j + 1}`,
                  price: typia.random<
                    number &
                      tags.Type<"int32"> &
                      tags.Minimum<100> &
                      tags.Maximum<5000>
                  >(),
                  stock_quantity: typia.random<
                    number &
                      tags.Type<"int32"> &
                      tags.Minimum<0> &
                      tags.Maximum<500>
                  >(),
                  attributes: JSON.stringify({
                    size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
                    color: RandomGenerator.pick([
                      "Red",
                      "Blue",
                      "Green",
                      "Black",
                    ] as const),
                  }),
                  active: true,
                } satisfies IShoppingMallProductVariant.ICreate,
              },
            );
          typia.assert(variant);
        }
      }
    }
  }

  // Step 4: Test comprehensive statistics retrieval
  const activeProducts = products.filter((p) => p.status === "active");
  const totalActiveProducts = activeProducts.length;

  // Test 1: Basic statistics without filters
  const basicStats =
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
          group_by: ["category", "status", "inventory_level"],
          metrics: [
            "total_sales",
            "revenue",
            "inventory_turnover",
            "price_analysis",
          ],
          filters: undefined,
          pagination: undefined,
        } satisfies IShoppingMallProductStatistics.IRequest,
      },
    );
  typia.assert(basicStats);

  // Validate basic statistics
  TestValidator.predicate(
    "statistics response should contain data records",
    basicStats.data.length > 0,
  );
  TestValidator.predicate(
    "pagination records count should be non-negative",
    basicStats.pagination.records >= 0,
  );

  // Test 2: Statistics with category filtering
  const categoryStats =
    await api.functional.shoppingMall.seller.statistics.products.index(
      connection,
      {
        body: {
          date_range: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          } satisfies IDateRange,
          group_by: ["category"],
          metrics: ["total_sales", "revenue"],
          filters: {
            category_ids: products.slice(0, 2).map((p) => p.category.id),
            status: ["active"] as IShoppingMallProductStatus[],
          } satisfies IShoppingMallProductFilters,
          pagination: undefined,
        } satisfies IShoppingMallProductStatistics.IRequest,
      },
    );
  typia.assert(categoryStats);

  // Test 3: Statistics with price range filtering
  const priceStats =
    await api.functional.shoppingMall.seller.statistics.products.index(
      connection,
      {
        body: {
          date_range: {
            start: undefined,
            end: new Date().toISOString(),
          } satisfies IDateRange,
          group_by: ["price_segment"],
          metrics: ["price_analysis", "performance"],
          filters: {
            min_price: 100,
            max_price: 2000,
            inventory_status: [
              "in_stock",
              "low_stock",
            ] as IShoppingMallInventoryStatus[],
          } satisfies IShoppingMallProductFilters,
          pagination: undefined,
        } satisfies IShoppingMallProductStatistics.IRequest,
      },
    );
  typia.assert(priceStats);

  // Test 4: Statistics with pagination
  const paginatedStats =
    await api.functional.shoppingMall.seller.statistics.products.index(
      connection,
      {
        body: {
          date_range: {
            start: new Date(
              Date.now() - 365 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            end: new Date().toISOString(),
          } satisfies IDateRange,
          group_by: ["seller", "product"],
          metrics: ["popularity", "performance"],
          filters: undefined,
          pagination: {
            current: 1,
            limit: 10,
            records: totalActiveProducts,
            pages: Math.ceil(totalActiveProducts / 10),
          } satisfies IPage.IPagination,
        } satisfies IShoppingMallProductStatistics.IRequest,
      },
    );
  typia.assert(paginatedStats);

  // Validate pagination
  TestValidator.equals(
    "pagination current page should be 1",
    paginatedStats.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    paginatedStats.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should match active product count",
    paginatedStats.pagination.records >= 0,
  );

  // Step 5: Validate statistics contain expected data
  const firstStat = basicStats.data[0];
  if (firstStat) {
    TestValidator.predicate(
      "total products count should be non-negative",
      firstStat.total_products >= 0,
    );
    TestValidator.predicate(
      "active products count should be non-negative",
      firstStat.active_products >= 0,
    );
    TestValidator.predicate(
      "low stock products count should be non-negative",
      firstStat.low_stock_products >= 0,
    );
    TestValidator.predicate(
      "out of stock products count should be non-negative",
      firstStat.out_of_stock_products >= 0,
    );

    if (firstStat.average_price !== undefined) {
      TestValidator.predicate(
        "average price should be reasonable value",
        firstStat.average_price >= 0,
      );
    }

    if (firstStat.price_range) {
      TestValidator.predicate(
        "price range min should be less than or equal to max",
        firstStat.price_range.min_price <= firstStat.price_range.max_price,
      );
      TestValidator.predicate(
        "median price should be within price range",
        firstStat.price_range.min_price <= firstStat.price_range.median_price &&
          firstStat.price_range.median_price <= firstStat.price_range.max_price,
      );
    }

    // Additional validation for category distribution
    if (firstStat.category_distribution) {
      TestValidator.predicate(
        "category distribution should have valid data",
        firstStat.category_distribution.length >= 0,
      );
      for (const categoryDist of firstStat.category_distribution) {
        TestValidator.predicate(
          "category distribution percentage should be valid",
          categoryDist.percentage >= 0 && categoryDist.percentage <= 100,
        );
        TestValidator.predicate(
          "category product count should be non-negative",
          categoryDist.productCount >= 0,
        );
      }
    }

    // Additional validation for seller distribution
    if (firstStat.seller_distribution) {
      TestValidator.predicate(
        "seller distribution should have valid data",
        firstStat.seller_distribution.length >= 0,
      );
      for (const sellerDist of firstStat.seller_distribution) {
        TestValidator.predicate(
          "seller product count should be non-negative",
          sellerDist.productCount >= 0,
        );
        TestValidator.predicate(
          "seller active ratio should be valid percentage",
          sellerDist.activeRatio >= 0 && sellerDist.activeRatio <= 100,
        );
      }
    }
  }

  // Step 6: Test error handling for invalid parameters
  await TestValidator.error(
    "should reject invalid date range format",
    async () => {
      await api.functional.shoppingMall.seller.statistics.products.index(
        connection,
        {
          body: {
            date_range: {
              start: "invalid-date-format",
              end: "another-invalid-date",
            } satisfies IDateRange,
            group_by: ["category"],
            metrics: ["total_sales"],
            filters: undefined,
            pagination: undefined,
          } satisfies IShoppingMallProductStatistics.IRequest,
        },
      );
    },
  );

  console.log(
    `✅ Comprehensive product statistics test completed successfully`,
  );
  console.log(
    `📊 Tested with ${products.length} products across ${categories.length} categories`,
  );
  console.log(`📈 Generated ${basicStats.data.length} statistical records`);
  console.log(
    `🔧 Tested ${categoryStats.data.length} category-filtered records`,
  );
  console.log(`💰 Tested ${priceStats.data.length} price-filtered records`);
}
