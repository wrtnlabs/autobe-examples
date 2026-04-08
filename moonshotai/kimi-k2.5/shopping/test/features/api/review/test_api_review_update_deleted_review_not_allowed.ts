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
 * Test review update failure when attempting to update a review that has been deleted by the customer.
 * Verify that: (1) Create a review as a customer, (2) Delete/mark the review as deleted using DELETE endpoint, (3) Attempt to update the deleted review should fail with a not-found or forbidden error, (4) The system prevents modification of deleted reviews to maintain data integrity.
 * Business rules: Once a review is deleted by the customer, it should no longer be editable; any update operation on a deleted review is rejected.
 */
export async function test_api_review_update_deleted_review_not_allowed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a customer using actor-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Create a review for a delivered order item using the generation utility
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(review);
  // 3. Delete the review (soft delete - sets deleted_at timestamp)
  await api.functional.ecommerceMall.customer.reviews.erase(
    customerConnection,
    {
      reviewId: review.id,
    },
  );
  // 4. Attempt to update the deleted review - should raise an error (404 Not Found or 403 Forbidden)
  await TestValidator.error("update deleted review should fail", async () => {
    await api.functional.ecommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: typia.random<IEcommerceMallReview.IUpdate["rating"]>(),
          content: typia.random<IEcommerceMallReview.IUpdate["content"]>(),
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  });
}
