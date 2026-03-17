import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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

export async function test_api_product_review_retrieval_existing_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: joinInput,
  });
  typia.assert(customerAuth);
  // 2. Generate review data
  const productId = typia.random<string & tags.Format<"uuid">>();
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const rating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const title = RandomGenerator.name(3) || null;
  const body = RandomGenerator.paragraph({ sentences: 5 });
  const reviewBody = {
    rating,
    title,
    body,
    product_id: productId,
    order_id: orderId,
  } satisfies IEcommerceMallReview.ICreate;
  // 3. Create product review
  const createdReview =
    await api.functional.ecommerceMall.customer.reviews.create(
      customerConnection,
      {
        body: reviewBody,
      },
    );
  typia.assert(createdReview);
  // 4. Retrieve the specific review by ID (using created review ID directly)
  const retrievedReview = await api.functional.ecommerceMall.reviews.at(
    customerConnection,
    {
      reviewId: createdReview.id,
    },
  );
  typia.assert(retrievedReview);
  // 5. Validate response structure
  TestValidator.equals(
    "review id matches",
    retrievedReview.id,
    createdReview.id,
  );
  TestValidator.equals(
    "customer id matches",
    retrievedReview.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "product id matches",
    retrievedReview.product.id,
    productId,
  );
  TestValidator.equals("order id matches", retrievedReview.order.id, orderId);
  TestValidator.equals("rating matches", retrievedReview.rating, rating);
  TestValidator.equals("title matches", retrievedReview.title, title);
  TestValidator.equals("body matches", retrievedReview.body, body);
  TestValidator.equals(
    "verified purchase status",
    retrievedReview.is_verified_purchase,
    true,
  );
  // 6. Verify active state (deleted_at is null)
  TestValidator.equals("review is active", retrievedReview.deleted_at, null);
  // 7. Validate timestamps are valid ISO 8601
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(retrievedReview.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(retrievedReview.updated_at);
    return !isNaN(date.getTime());
  });
}