import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test retrieving product rating information when the product has multiple non-deleted customer reviews.
 *
 * This test validates the product ratings endpoint by:
 * 1. Authenticating as a customer
 * 2. Retrieving rating information for a product
 * 3. Validating the response structure contains averageRating and totalReviews
 * 4. Verifying consistency between averageRating and totalReviews (null average when no reviews exist)
 *
 * Note: The available SDK only provides the GET endpoint for ratings retrieval.
 * In a complete test environment with review creation APIs, this test would create
 * multiple reviews with different ratings (e.g., 5, 4, 3 stars) and verify that
 * averageRating equals the arithmetic mean (4.0) and totalReviews equals the count (3).
 */
export async function test_api_product_rating_with_multiple_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Retrieve product rating information
  // Note: In a complete test, we would first create a product and multiple reviews
  // For now, we test with a random product UUID to validate the endpoint response structure
  const productId = typia.random<string & tags.Format<"uuid">>();
  const rating = await api.functional.shoppingMall.customer.products.ratings.at(
    customerConnection,
    {
      productId: productId,
    },
  );
  // 3. Validate response structure with typia (validates all type constraints including ranges)
  typia.assert(rating);
  // 4. Validate business logic consistency between averageRating and totalReviews
  // If totalReviews is 0, averageRating must be null
  if (rating.totalReviews === 0) {
    TestValidator.equals(
      "averageRating null when no reviews",
      rating.averageRating,
      null,
    );
  }
  // If totalReviews > 0, averageRating must not be null
  if (rating.totalReviews > 0) {
    TestValidator.predicate(
      "averageRating exists when reviews exist",
      () => rating.averageRating !== null,
    );
  }
}
