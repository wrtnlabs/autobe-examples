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

export async function test_api_customer_review_create_rating_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies Partial<IEcommerceMallCustomer.IJoin>,
  });
  typia.assert(customer);
  // 2. Generate review with NULL content (rating-only review)
  const reviewBody = {
    orderItemId: typia.random<string & tags.Format<"uuid">>(),
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    content: null,
  } satisfies IEcommerceMallReview.ICreate;
  // 3. Create the review
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    { body: reviewBody },
  );
  typia.assert(review);
  // 4. Validate the review was created with minimum fields
  TestValidator.equals(
    "rating matches input",
    review.rating,
    reviewBody.rating,
  );
  TestValidator.equals(
    "orderItemId matches input",
    review.orderItemId,
    reviewBody.orderItemId,
  );
  TestValidator.equals("content is null", review.content, null);
  TestValidator.equals(
    "customer.id matches authenticated user",
    (review.customer as { id: string }).id,
    customer.id,
  );
}