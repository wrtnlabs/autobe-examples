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
 * Test retrieving product rating information when the product has no customer reviews yet.
 *
 * This test validates the edge case where a product exists but has never been reviewed.
 * The system should return averageRating as null (not 0) and totalReviews as 0 to
 * correctly indicate the absence of any review history.
 *
 * Test Flow:
 * 1. Authenticate as a customer using authorize_customer_join utility
 * 2. Create customer-specific connection with authentication token
 * 3. Generate a valid product UUID to query ratings
 * 4. Call the ratings endpoint
 * 5. Validate response structure and null averageRating
 */
export async function test_api_product_rating_no_reviews(
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
  // 2. Generate a product UUID for querying ratings
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve product ratings (product has no reviews)
  const rating: IShoppingMallProductRating =
    await api.functional.shoppingMall.customer.products.ratings.at(
      customerConnection,
      {
        productId: productId,
      },
    );
  // 4. Validate response structure
  typia.assert(rating);
  // 5. Verify averageRating is null (not 0) when no reviews exist
  TestValidator.equals(
    "averageRating is null for no reviews",
    rating.averageRating,
    null,
  );
  // 6. Verify totalReviews is 0
  TestValidator.equals("totalReviews is zero", rating.totalReviews, 0);
}
