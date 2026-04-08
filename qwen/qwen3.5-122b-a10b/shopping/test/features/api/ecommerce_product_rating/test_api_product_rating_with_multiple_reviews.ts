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

/**
 * Test product rating endpoint response structure and type validation.
 *
 * Validates the product rating retrieval endpoint's response format and business logic for average rating calculation. Since product and review creation SDK functions are not available in the provided API functions, this test focuses on validating the rating endpoint's response structure and type safety.
 *
 * The test authenticates a customer and calls the rating endpoint to verify the response conforms to the expected IEcommerceProductRating type with proper average_rating and review_count fields.
 *
 * 1. Customer registers and authenticates via join endpoint.
 * 2. Calls product rating endpoint with a valid product UUID.
 * 3. Validates response type with typia.assert().
 * 4. Verifies average_rating is either null or a number between 1-5.
 * 5. Verifies review_count is a non-negative integer.
 */
export async function test_api_product_rating_with_multiple_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
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
  // 2. Call product rating endpoint with a valid product UUID
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const rating = await api.functional.ecommerce.customer.products.rating.at(
    customerConnection,
    {
      productId,
    },
  );
  typia.assert(rating);
  // 3. Validate response structure
  TestValidator.predicate(
    "average_rating is null or number between 1-5",
    rating.average_rating === null ||
      (rating.average_rating >= 1 && rating.average_rating <= 5),
  );
  TestValidator.predicate(
    "review_count is non-negative integer",
    rating.review_count >= 0,
  );
}
