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
 * Test product statistics focused on seller performance and contribution
 * analysis.
 *
 * This E2E test validates that administrators can analyze seller distribution
 * patterns including product counts per seller and active ratio calculations.
 * The test creates multiple seller accounts with varying product distributions
 * to test grouping by seller dimension and verify that seller performance
 * metrics help identify top contributors and engagement opportunities.
 *
 * The test ensures that seller distribution analysis supports marketplace
 * growth strategies and seller relationship management by validating
 * comprehensive seller performance metrics through the product statistics API.
 */
export async function test_api_admin_product_statistics_seller_performance(
  connection: api.IConnection,
) {
  // Create administrator account for system-wide access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: "Admin",
        last_name: "User",
        role: "super_admin",
        permissions: JSON.stringify({ all: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create multiple seller accounts with different business profiles
  const sellers: IShoppingMallSeller.IAuthorized[] = [];
  const sellerEmails = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"email">>(),
  );

  for (const email of sellerEmails) {
    const seller: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.join(connection, {
        body: {
          email,
          password: "seller123",
          business_name: RandomGenerator.paragraph({ sentences: 2 }),
          contact_person: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          business_address: RandomGenerator.paragraph({ sentences: 3 }),
          tax_id: typia.random<string & tags.Pattern<"^\\d{2}-\\d{7}$">>(),
          href: "https://example.com/register",
          referrer: "https://example.com",
        } satisfies IShoppingMallSeller.ICreate,
      });
    typia.assert(seller);
    sellers.push(seller);
  }

  // Create products from each seller with varying statuses and inventory levels
  const products: IShoppingMallProduct[] = [];

  for (const [index, seller] of sellers.entries()) {
    // Switch to seller context
    await api.functional.auth.seller.login(connection, {
      body: {
        email: seller.email,
        password: "seller123",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IShoppingMallSeller.ILogin,
    });

    // Create different number of products per seller to test distribution
    const productCount = index === 0 ? 5 : index === 1 ? 3 : 2;

    for (let i = 0; i < productCount; i++) {
      const product: IShoppingMallProduct =
        await api.functional.shoppingMall.seller.products.create(connection, {
          body: {
            name: RandomGenerator.paragraph({ sentences: 3 }),
            description: RandomGenerator.content({ paragraphs: 2 }),
            sku: `SKU-${seller.id.slice(0, 8)}-${i}`,
            price: typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<1000> &
                tags.Maximum<50000>
            >(),
            compare_price: typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<50000> &
                tags.Maximum<100000>
            >(),
            cost_price: typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<500> &
                tags.Maximum<25000>
            >(),
            stock_quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
            >(),
            status: i % 2 === 0 ? "active" : "draft",
            condition: "new",
            weight: typia.random<
              number & tags.Minimum<0.1> & tags.Maximum<50>
            >(),
            dimensions: "10x5x3",
            category: {
              id: typia.random<string & tags.Format<"uuid">>(),
              name: "Electronics",
              description: "Electronic products",
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
      products.push(product);
    }
  }

  // Switch back to admin context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Call product statistics API with seller grouping
  const statistics: IPageIShoppingMallProductStatistics =
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
          group_by: ["seller"],
          filters: {
            status: ["active", "draft"],
          } satisfies IShoppingMallProductFilters,
          metrics: ["performance", "price_analysis"],
          pagination: {
            current: 1,
            limit: 100,
            records: products.length,
            pages: 1,
          } satisfies IPage.IPagination,
        } satisfies IShoppingMallProductStatistics.IRequest,
      },
    );
  typia.assert(statistics);

  // Validate seller distribution metrics
  TestValidator.predicate(
    "statistics should contain seller distribution data",
    statistics.data.length > 0,
  );

  // Verify seller distribution analysis
  if (statistics.data[0]?.seller_distribution) {
    const sellerDistribution = statistics.data[0].seller_distribution;

    TestValidator.predicate(
      "seller distribution should include seller data",
      sellerDistribution.length > 0,
    );

    // Validate product counts and active ratios
    for (const distribution of sellerDistribution) {
      TestValidator.predicate(
        "seller distribution should have valid product count",
        distribution.productCount >= 0,
      );

      TestValidator.predicate(
        "seller distribution should have valid active ratio",
        distribution.activeRatio >= 0 && distribution.activeRatio <= 100,
      );
    }
  }

  // Validate overall statistics structure
  TestValidator.predicate(
    "statistics should contain total products count",
    statistics.data[0]?.total_products !== undefined,
  );

  TestValidator.predicate(
    "statistics should contain active products count",
    statistics.data[0]?.active_products !== undefined,
  );

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should be properly structured",
    statistics.pagination.current === 1 && statistics.pagination.limit === 100,
  );
}
