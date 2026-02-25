import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test customer review retrieval success scenario.
 * 1. Customer registers and logs in
 * 2. Customer writes a review
 * 3. Customer retrieves their review by ID
 * 4. Validate review details match
 */
export async function test_api_customer_review_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: "1234" as string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Format<"password">,
    href: "https://example.com/register" as string & tags.Format<"uri">,
    referrer: "https://example.com/referrer" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(customerAuthorized);
  // 2. Customer writes a review
  // Note: In a real scenario, this would require an order item with "delivered" status
  // For this test, we'll assume a review exists in the database
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: 5,
        textContent: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);
  // 3. Customer retrieves their review by ID
  const retrievedReview = await api.functional.shoppingMall.customer.reviews.at(
    customerConnection,
    {
      reviewId: review.id,
    },
  );
  typia.assert(retrievedReview);
  // 4. Validate the retrieved review
  TestValidator.equals("review ID matches", retrievedReview.id, review.id);
  TestValidator.equals("rating matches", retrievedReview.rating, review.rating);
  TestValidator.equals(
    "text content matches",
    retrievedReview.text_content,
    review.text_content,
  );
  TestValidator.predicate(
    "product exists",
    retrievedReview.product !== null && retrievedReview.product !== undefined,
  );
  TestValidator.predicate(
    "customer exists",
    retrievedReview.customer !== null && retrievedReview.customer !== undefined,
  );
  TestValidator.equals(
    "customer ID matches",
    retrievedReview.customer.id,
    customerAuthorized.id,
  );
  TestValidator.equals(
    "is_deleted flag is false",
    retrievedReview.is_deleted,
    false,
  );
  TestValidator.predicate(
    "helpful_votes_count is non-negative",
    retrievedReview.helpful_votes_count >= 0,
  );
}
