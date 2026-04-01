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
 * Test that product rating calculation correctly excludes soft-deleted reviews.
 *
 * This test validates the product ratings endpoint returns properly structured data
 * where averageRating is calculated only from non-deleted reviews and totalReviews
 * counts only non-deleted reviews. Note: Full scenario testing (creating reviews,
 * deleting some, verifying recalculation) requires review CRUD APIs which are not
 * available in the current API function list. This test validates the endpoint
 * response structure and type correctness.
 *
 * Expected behavior per specification:
 * - averageRating: null when no non-deleted reviews exist, otherwise 1.0-5.0
 * - totalReviews: count of non-deleted reviews (non-negative integer)
 * - Deleted reviews (deleted_at IS NOT NULL) are excluded from both calculations
 */
export async function test_api_product_rating_excludes_deleted_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer to access the ratings endpoint
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Get product ratings for a product
  // Note: Without review CRUD APIs available, we test with a random product ID
  // The endpoint should return valid rating structure regardless of review existence
  const productId = typia.random<string & tags.Format<"uuid">>();
  const rating = await api.functional.shoppingMall.customer.products.ratings.at(
    customerConnection,
    {
      productId,
    },
  );
  typia.assert(rating);
  // 3. Validate rating structure per IShoppingMallProductRating specification
  TestValidator.predicate("rating object exists", rating !== null);
  // averageRating: null when no reviews, otherwise between 1-5
  if (rating.averageRating !== null) {
    TestValidator.predicate(
      "averageRating is between 1 and 5",
      rating.averageRating >= 1 && rating.averageRating <= 5,
    );
  }
  // totalReviews: non-negative integer
  TestValidator.predicate(
    "totalReviews is non-negative",
    rating.totalReviews >= 0,
  );
  // Validate consistency: if totalReviews is 0, averageRating should be null
  if (rating.totalReviews === 0) {
    TestValidator.equals(
      "averageRating is null when no reviews",
      rating.averageRating,
      null,
    );
  }
}
