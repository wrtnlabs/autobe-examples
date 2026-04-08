import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategoriesStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesStatistic";
import type { IEcommerceMallProductOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverview";
import type { IEcommerceMallProductOverviewRecentProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverviewRecentProduct";
import type { IEcommerceMallProductOverviewSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverviewSeller";
import type { IEcommerceMallProductOverviewStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverviewStatusBreakdown";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test authenticated seller can view comprehensive product overview statistics.
 *
 * Validates that an authenticated seller can access platform-wide product statistics
 * endpoint. Verifies proper authentication, response structure validation, and data
 * integrity across all aggregation fields. Tests that the overview endpoint returns
 * valid statistics including total product counts, category distribution, review metrics,
 * and seller activity data.
 *
 * Special attention is given to verifying response schema compliance and ensuring all
 * required fields are present with correct types. The test confirms that sellers can
 * view platform-wide metrics while maintaining data accuracy across different aggregation
 * dimensions.
 *
 * 1. Seller authentication: Create seller account with valid credentials.
 * 2. Overview request: Seller requests product overview statistics.
 * 3. Response validation: Verify schema compliance and field types.
 * 4. Business rules validation: Check sorting and numeric constraints.
 */
export async function test_api_seller_product_overview_with_data(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account for authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://seller-app.test/register",
      referrer: "http://seller-app.test/",
    },
  });
  typia.assert(sellerAuth);
  // Step 2: Request product overview with authenticated seller
  const overview =
    await api.functional.ecommerceMall.seller.products.overview(
      sellerConnection,
    );
  typia.assert(overview);
  // Step 3: Validate response schema compliance
  TestValidator.equals(
    "total products is non-negative integer",
    overview.totalProducts,
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  );
  TestValidator.equals(
    "deleted products is non-negative integer",
    overview.deletedProducts,
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  );
  TestValidator.equals(
    "categories with products is non-negative integer",
    overview.totalCategoriesWithProducts,
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  );
  // Validate average rating (can be null or number)
  if (overview.averageRating !== null) {
    TestValidator.predicate(
      "average rating is a valid number",
      typeof overview.averageRating === "number",
    );
    TestValidator.predicate(
      "average rating is rounded to 2 decimal places",
      Math.round(overview.averageRating * 100) / 100 === overview.averageRating,
    );
  }
  TestValidator.equals(
    "total reviews is non-negative integer",
    overview.totalReviews,
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  );
  // Validate products by category array
  TestValidator.predicate(
    "products by category is array",
    Array.isArray(overview.productsByCategory),
  );
  for (const category of overview.productsByCategory) {
    TestValidator.equals(
      "category has valid id",
      typeof category.category_id,
      "string",
    );
    TestValidator.equals("category has name", typeof category.name, "string");
    TestValidator.equals(
      "category has non-negative product count",
      category.product_count,
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    );
  }
  // Validate products by seller array
  TestValidator.predicate(
    "products by seller is array",
    Array.isArray(overview.productsBySeller),
  );
  for (const seller of overview.productsBySeller) {
    TestValidator.equals(
      "seller has valid id",
      typeof seller.seller_id,
      "string",
    );
    TestValidator.equals(
      "seller has display name",
      typeof seller.display_name,
      "string",
    );
    TestValidator.equals(
      "seller has non-negative product count",
      seller.product_count,
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    );
  }
  // Validate recent products array
  TestValidator.predicate(
    "recent products is array",
    Array.isArray(overview.recentProducts),
  );
  for (const product of overview.recentProducts) {
    TestValidator.equals("product has valid id", typeof product.id, "string");
    TestValidator.equals("product has name", typeof product.name, "string");
    TestValidator.equals(
      "product has category id",
      typeof product.category_id,
      "string",
    );
    TestValidator.predicate(
      "product base price is non-negative",
      product.base_price >= 0,
    );
    TestValidator.equals(
      "product has created_at timestamp",
      typeof product.created_at,
      "string",
    );
  }
  // Validate status breakdown
  TestValidator.equals(
    "status breakdown active is non-negative",
    overview.statusBreakdown.active,
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  );
  TestValidator.equals(
    "status breakdown deleted is non-negative",
    overview.statusBreakdown.deleted,
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  );
}
