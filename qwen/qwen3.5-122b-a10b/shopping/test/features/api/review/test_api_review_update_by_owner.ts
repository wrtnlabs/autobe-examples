import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_reviews_create } from "../../../generate/generate_random_ecommerce_customer_reviews_create";
import { prepare_random_ecommerce_review } from "../../../prepare/prepare_random_ecommerce_review";

/**
 * Test customer review update functionality with snapshot audit trail.
 *
 * Validates that authenticated customers can successfully update their own product reviews, including rating changes and content modifications. Ensures the updated_at timestamp is properly updated and that snapshot records are created to preserve the previous review state for audit purposes.
 *
 * The test follows this workflow:
 * 1. Authenticate as a customer
 * 2. Create a review with initial rating (3 stars) and content using the generation utility
 * 3. Update the review with new rating (5 stars) and new content
 * 4. Verify response contains updated review with new values
 * 5. Verify updated_at timestamp changed from original
 * 6. Verify created_at timestamp remained unchanged
 *
 * Special attention is given to ensuring the update operation properly triggers snapshot creation and that the audit trail mechanism captures the complete previous state before modification. Snapshot verification requires admin access and is validated separately in admin oversight tests.
 */
export async function test_api_review_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
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
  // 2. Create initial review with rating 3 and content
  const initialContent = RandomGenerator.paragraph({ sentences: 3 });
  const initialReview = await generate_random_ecommerce_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: 3,
        content: initialContent,
      } satisfies Partial<IEcommerceReview.ICreate>,
    },
  );
  typia.assert(initialReview);
  // Store original timestamp for comparison
  const originalUpdatedAt = initialReview.updated_at;
  // 3. Update review with new rating (5 stars) and new content
  const updatedContent = RandomGenerator.paragraph({ sentences: 2 });
  const updatedReview = await api.functional.ecommerce.customer.reviews.update(
    customerConnection,
    {
      reviewId: initialReview.id,
      body: {
        rating: 5,
        content: updatedContent,
      } satisfies IEcommerceReview.IUpdate,
    },
  );
  typia.assert(updatedReview);
  // 4. Verify response contains updated values
  TestValidator.equals("rating updated to 5", updatedReview.rating, 5);
  TestValidator.equals(
    "content updated",
    updatedReview.content,
    updatedContent,
  );
  TestValidator.equals(
    "review ID preserved",
    updatedReview.id,
    initialReview.id,
  );
  TestValidator.equals(
    "customer ID preserved",
    updatedReview.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "order item ID preserved",
    updatedReview.orderItem.id,
    initialReview.orderItem.id,
  );
  TestValidator.equals(
    "product ID preserved",
    updatedReview.product.id,
    initialReview.product.id,
  );
  // 5. Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed after modification",
    updatedReview.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedReview.updated_at) >= new Date(initialReview.created_at),
  );
  // 6. Verify created_at timestamp remained unchanged
  TestValidator.equals(
    "created_at preserved",
    updatedReview.created_at,
    initialReview.created_at,
  );
}
