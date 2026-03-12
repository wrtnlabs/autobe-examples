import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAnalytic";
import type { IShoppingMallProductAnalyticCategoryDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAnalyticCategoryDistribution";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a newly registered seller with no products, orders, or reviews receives correct empty analytics.
 *
 * This test verifies that the product analytics endpoint correctly handles
 * the case where a seller has no products, orders, or reviews. All metrics
 * should return zero values, and the average rating should be null.
 */
export async function test_api_seller_product_analytics_with_no_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register and authenticate a new seller (no products created)
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Call analytics endpoint for seller with no data
  const analytics =
    await api.functional.shoppingMall.seller.products.analytics(
      sellerConnection,
    );
  typia.assert(analytics);
  // 4. Validate all metrics are zero or empty
  TestValidator.equals("totalProducts is 0", analytics.totalProducts, 0);
  TestValidator.equals(
    "categoryDistribution is empty array",
    analytics.categoryDistribution,
    [],
  );
  TestValidator.equals("averageRating is null", analytics.averageRating, null);
  TestValidator.equals("totalReviews is 0", analytics.totalReviews, 0);
  TestValidator.equals("totalUnitsSold is 0", analytics.totalUnitsSold, 0);
  TestValidator.equals("totalRevenue is 0", analytics.totalRevenue, 0);
  TestValidator.equals("outOfStockCount is 0", analytics.outOfStockCount, 0);
  TestValidator.equals(
    "suspendedSellerProductsCount is 0",
    analytics.suspendedSellerProductsCount,
    0,
  );
}
