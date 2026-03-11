import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export async function test_api_customer_review_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() satisfies string as string),
      password: "12345678",
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(customer);
  // 2. Create a review for a product
  const product_id = typia.random<string & tags.Format<"uuid">>();
  const expected_rating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = 5;
  const text_content = "Great product, highly recommend!";
  const review = await api.functional.ecommerceMall.customer.reviews.create(
    customerConnection,
    {
      body: {
        rating: expected_rating,
        text_content,
        product_id,
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review);
  // 3. Validate review response
  TestValidator.equals(
    "rating equals expected",
    review.rating,
    expected_rating,
  );
  TestValidator.equals(
    "text content matches",
    review.textContent,
    text_content,
  );
  TestValidator.equals("review is active", review.isActive, true);
  TestValidator.equals("deletedAt is null", review.deletedAt, null);
  TestValidator.predicate(
    "createdAt is set",
    new Date(review.createdAt) instanceof Date,
  );
  TestValidator.predicate(
    "updatedAt is set",
    new Date(review.updatedAt) instanceof Date,
  );
  TestValidator.equals(
    "customer email matches",
    review.customer.email,
    customer.email,
  );
  TestValidator.predicate(
    "customer has display name",
    review.customer.display_name.length > 0,
  );
  TestValidator.predicate(
    "product has name",
    review.product.name.length > 0,
  );
  TestValidator.predicate(
    "basePrice is positive",
    review.product.basePrice > 0,
  );
  TestValidator.predicate(
    "product has category",
    review.product.category.id.length > 0,
  );
  TestValidator.predicate(
    "product has seller",
    review.product.seller.id.length > 0,
  );
}