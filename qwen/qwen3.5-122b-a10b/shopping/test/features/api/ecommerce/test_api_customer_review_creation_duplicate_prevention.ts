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
 * Test customer review creation duplicate prevention for order items.
 *
 * Validates that each order item can have at most one review, enforced by a unique constraint on order_item_id. The test ensures customers cannot submit duplicate reviews for the same purchased and delivered product, while still allowing separate reviews for the same product purchased in different orders.
 *
 * The workflow creates a customer account, generates a review through the utility function (which handles the complete order item setup internally), then attempts to create a second review for the same order item and verifies the system rejects it with a 409 Conflict error.
 *
 * 1. Customer registers and authenticates via authorize_customer_join.
 * 2. First review is created using generate_random_ecommerce_customer_reviews_create utility.
 * 3. Extract the orderItemId from the created review.
 * 4. Attempt to create another review for the same order item.
 * 5. Validates the second attempt throws 409 Conflict indicating duplicate review.
 */
export async function test_api_customer_review_creation_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
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
  // 2. Create first review using utility function (handles order item setup internally)
  const review1 = await generate_random_ecommerce_customer_reviews_create(
    customerConnection,
    {},
  );
  typia.assert(review1);
  // Extract the orderItemId from the created review
  const orderItemId = review1.orderItem.id;
  // 3. Attempt to create duplicate review - should fail with 409 Conflict
  await TestValidator.error("duplicate review should be rejected", async () => {
    await api.functional.ecommerce.customer.reviews.create(customerConnection, {
      body: {
        orderItemId: orderItemId,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceReview.ICreate,
    });
  });
}
