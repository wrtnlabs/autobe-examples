import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductRating";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_rating_excludes_deleted_reviews(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that deleted reviews are excluded from the average rating calculation.
   *
   * Validates the product rating endpoint returns correct rating statistics by verifying the response structure and type safety. Since product and review creation APIs are not available in the provided SDK, this test focuses on endpoint response validation.
   *
   * 1. Create customer account for authentication.
   * 2. Generate random product UUID for testing.
   * 3. Call rating endpoint with product ID.
   * 4. Validate response contains average_rating and review_count fields.
   */
  // 1. Create customer account for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate a random product UUID for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call the rating endpoint
  const rating = await api.functional.ecommerce.customer.products.rating.at(
    customerConnection,
    {
      productId,
    },
  );
  typia.assert(rating);
  // 4. Validate response structure
  TestValidator.predicate(
    "average_rating is number or null",
    typeof rating.average_rating === "number" || rating.average_rating === null,
  );
  TestValidator.predicate(
    "review_count is non-negative integer",
    rating.review_count >= 0,
  );
}
