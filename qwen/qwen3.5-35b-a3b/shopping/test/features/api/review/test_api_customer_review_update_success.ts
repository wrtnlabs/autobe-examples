import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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

export async function test_api_customer_review_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<(string & tags.Format<"uri">)>() ?? undefined,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Customer creates a review (using customer's authenticated connection)
  const createdReview =
    await generate_random_ecommerce_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(createdReview);
  // 3. Store original values for snapshot validation
  const originalRating = createdReview.rating;
  const originalBody = createdReview.body;
  const originalUpdatedAt = createdReview.updated_at;
  // 4. Update the review with new values
  const newRating = originalRating === 5 ? 4 : originalRating + 1;
  const newBody = RandomGenerator.content({ paragraphs: 2 });
  const updatedReview =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: createdReview.id,
        body: {
          rating: newRating,
          body: newBody,
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 5. Validate update succeeded
  TestValidator.equals(
    "rating updated correctly",
    updatedReview.rating,
    newRating,
  );
  TestValidator.equals("body updated correctly", updatedReview.body, newBody);
  TestValidator.notEquals(
    "updated_at changed after modification",
    originalUpdatedAt,
    updatedReview.updated_at,
  );
  TestValidator.equals(
    "review id unchanged",
    updatedReview.id,
    createdReview.id,
  );
  TestValidator.equals(
    "customer unchanged",
    updatedReview.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "product unchanged",
    updatedReview.product.id,
    createdReview.product.id,
  );
  TestValidator.equals(
    "order unchanged",
    updatedReview.order.id,
    createdReview.order.id,
  );
  TestValidator.equals(
    "is_verified_purchase unchanged",
    updatedReview.is_verified_purchase,
    createdReview.is_verified_purchase,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedReview.created_at,
    createdReview.created_at,
  );
}