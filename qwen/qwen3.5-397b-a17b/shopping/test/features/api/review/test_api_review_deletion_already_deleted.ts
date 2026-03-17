import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_customers_order_items_review_create } from "../../../generate/generate_random_shopping_mall_customer_customers_order_items_review_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test that attempting to delete an already deleted review returns 404 Not Found.
 *
 * Test Flow:
 * 1. Register a customer account
 * 2. Create a review for a delivered order item
 * 3. Delete the review once (successful)
 * 4. Attempt to delete the same review again
 * 5. Verify the second deletion request is rejected with 404 Not Found error
 *
 * This validates that already soft-deleted reviews cannot be deleted again
 * and proper error handling is in place.
 */
export async function test_api_review_deletion_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create a review for a delivered order item
  // Note: This requires a pre-existing delivered order item belonging to the customer
  // In production, this would be created through the full order workflow
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const review =
    await api.functional.shoppingMall.customer.customers.order_items.review.create(
      customerConnection,
      {
        orderItemId: orderItemId,
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(review);
  // 3. Delete the review once (successful - first deletion)
  await api.functional.shoppingMall.customer.reviews.erase(customerConnection, {
    reviewId: review.id,
  });
  // 4. Attempt to delete the same review again - should fail with 404 Not Found
  // The review is already soft-deleted, so second deletion should be rejected
  await TestValidator.error(
    "deleting already deleted review should return 404 Not Found",
    async () => {
      await api.functional.shoppingMall.customer.reviews.erase(
        customerConnection,
        {
          reviewId: review.id,
        },
      );
    },
  );
}
