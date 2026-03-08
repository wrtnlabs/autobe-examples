import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
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

export async function test_api_review_creation_rating_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer account creation and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Create authenticated connection for customer operations
  const customerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAuth.token.access },
  };
  // 3. Create a review with only rating and null text_content
  // Note: Using a random product ID since no product creation API is available in the test scope
  const testProduct = typia.random<string & tags.Format<"uuid">>();
  const reviewRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const reviewText = null;
  const review = await api.functional.ecommerceMall.customer.reviews.create(
    customerAuthConnection,
    {
      body: {
        product_id: testProduct,
        rating: reviewRating,
        text_content: reviewText,
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review);
  // 4. Verify review created with is_active=true and text_content=null
  TestValidator.equals("review is active", review.is_active, true);
  TestValidator.equals("text content is null", review.text_content, null);
  TestValidator.equals("rating matches input", review.rating, reviewRating);
  // 5. Verify review appears on product's review list
  const productReviews =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId: testProduct,
      body: {},
    });
  typia.assert(productReviews);
  const foundReview = productReviews.data.find((r) => r.id === review.id);
  TestValidator.equals(
    "review found on product list",
    foundReview !== undefined,
    true,
  );
  if (foundReview) {
    TestValidator.equals(
      "product review rating matches",
      foundReview.rating,
      reviewRating,
    );
  }
  // 6. Verify review appears in customer's review dashboard
  const customerReviewDashboard =
    await api.functional.ecommerceMall.customer.reviews.dashboard.index(
      customerAuthConnection,
      {
        body: {},
      },
    );
  typia.assert(customerReviewDashboard);
  const customerReview = customerReviewDashboard.data.find(
    (r) => r.id === review.id,
  );
  TestValidator.equals(
    "review found in customer dashboard",
    customerReview !== undefined,
    true,
  );
  if (customerReview) {
    TestValidator.equals(
      "customer dashboard review rating matches",
      customerReview.rating,
      reviewRating,
    );
  }
}
