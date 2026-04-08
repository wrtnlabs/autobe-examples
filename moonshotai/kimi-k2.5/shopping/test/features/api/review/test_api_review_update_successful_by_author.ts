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

export async function test_api_review_update_successful_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection with authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Create initial review
  const originalReview =
    await generate_random_ecommerce_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(originalReview);
  const originalCreatedAt = originalReview.createdAt;
  const originalUpdatedAt = originalReview.updatedAt;
  // 3. Prepare updated values
  const newRating = originalReview.rating === 5 ? 4 : 5;
  const newContent = RandomGenerator.paragraph({ sentences: 5 });
  // 4. Update the review
  const updatedReview =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: originalReview.id,
        body: {
          rating: newRating,
          content: newContent,
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 5. Verify update response reflects changes
  TestValidator.equals("rating updated", updatedReview.rating, newRating);
  TestValidator.equals("content updated", updatedReview.content, newContent);
  TestValidator.equals("id unchanged", updatedReview.id, originalReview.id);
  TestValidator.equals(
    "createdAt preserved",
    updatedReview.createdAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updatedAt is newer",
    new Date(updatedReview.updatedAt) > new Date(originalUpdatedAt),
  );
  // 6. Verify changes persist by fetching the review
  const fetchedReview = await api.functional.ecommerceMall.reviews.at(
    customerConnection,
    {
      reviewId: originalReview.id,
    },
  );
  typia.assert(fetchedReview);
  // 7. Verify fetched review matches updated values
  TestValidator.equals(
    "fetched rating matches",
    fetchedReview.rating,
    newRating,
  );
  TestValidator.equals(
    "fetched content matches",
    fetchedReview.content,
    newContent,
  );
  TestValidator.equals(
    "fetched createdAt preserved",
    fetchedReview.createdAt,
    originalCreatedAt,
  );
  TestValidator.equals(
    "fetched updatedAt matches",
    fetchedReview.updatedAt,
    updatedReview.updatedAt,
  );
}
