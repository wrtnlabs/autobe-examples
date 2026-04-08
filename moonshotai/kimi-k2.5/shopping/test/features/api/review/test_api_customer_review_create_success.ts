import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

/**
 * Test successful creation of a review by an authenticated customer for a delivered order item.
 *
 * Scenario:
 * 1. Authenticate a customer using join utility
 * 2. Create a review for a delivered order item using the generation utility
 * 3. Verify the review response contains the submitted rating and content
 * 4. Verify the review is linked to the correct customer and order item
 */
export async function test_api_customer_review_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Step 2: Prepare specific review data for validation
  const rating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = 4;
  const content =
    "Excellent product quality and fast shipping! Highly recommended.";
  // Step 3: Create review for a delivered order item using the generation utility
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating,
        content,
      },
    },
  );
  // Step 4: Validate review response structure
  typia.assert(review);
  // Step 5: Verify submitted data is correctly stored
  TestValidator.equals(
    "review rating matches submitted value",
    review.rating,
    rating,
  );
  TestValidator.equals(
    "review content matches submitted value",
    review.content,
    content,
  );
  // Step 6: Verify review has valid order item association
  typia.assert(review.orderItemId);
}
