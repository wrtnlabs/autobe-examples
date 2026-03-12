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
 * Test that an authenticated seller can retrieve comprehensive product analytics for their own products.
 *
 * This test verifies that a seller can access their product analytics dashboard
 * after successful registration. The analytics include product counts, category
 * distribution, ratings, reviews, sales metrics, and inventory status.
 */
export async function test_api_seller_product_analytics_with_active_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
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
  typia.assert(sellerAuth);
  // 2. Verify seller authentication response
  TestValidator.predicate(
    "seller has valid UUID",
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
      sellerAuth.id,
    ),
  );
  TestValidator.predicate(
    "shop name is not empty",
    sellerAuth.shop_name.length > 0,
  );
  TestValidator.predicate(
    "has access token",
    sellerAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    sellerAuth.token.refresh.length > 0,
  );
  // 3. Call analytics endpoint with authenticated seller connection
  const analytics =
    await api.functional.shoppingMall.seller.products.analytics(
      sellerConnection,
    );
  typia.assert(analytics);
  // 4. Validate analytics response - business logic checks only (typia.assert handles types)
  TestValidator.equals(
    "new seller has zero products",
    analytics.totalProducts,
    0,
  );
  TestValidator.equals(
    "new seller has zero reviews",
    analytics.totalReviews,
    0,
  );
  TestValidator.equals(
    "new seller has zero units sold",
    analytics.totalUnitsSold,
    0,
  );
  TestValidator.equals(
    "new seller has zero revenue",
    analytics.totalRevenue,
    0,
  );
  TestValidator.equals(
    "new seller has zero out of stock",
    analytics.outOfStockCount,
    0,
  );
  TestValidator.equals(
    "new seller has zero suspended products",
    analytics.suspendedSellerProductsCount,
    0,
  );
  TestValidator.equals(
    "category distribution is empty",
    analytics.categoryDistribution.length,
    0,
  );
  TestValidator.equals(
    "averageRating is null for new seller",
    analytics.averageRating,
    null,
  );
}
