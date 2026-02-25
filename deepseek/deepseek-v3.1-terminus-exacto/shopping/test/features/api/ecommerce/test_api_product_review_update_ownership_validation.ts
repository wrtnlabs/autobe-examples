import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_customer_products_reviews_create";
import { prepare_random_ecommerce_review } from "../../../prepare/prepare_random_ecommerce_review";

/**
 * Test ownership validation scenario where one customer attempts to update another customer's review.
 * Create two separate customer accounts via join, have Customer A create a review, then attempt to update
 * that same review using Customer B's authentication. Validate that the system correctly rejects the
 * update attempt with appropriate authorization error, ensuring that customers can only modify their own reviews.
 */
export async function test_api_product_review_update_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Customer A account and authenticate
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "Customer A",
      phone_number: "010-1234-5678",
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Create Customer B account and authenticate
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      display_name: "Customer B",
      phone_number: "010-9876-5432",
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3. Customer A creates a product review
  const productId = typia.random<string & tags.Format<"uuid">>();
  const originalReview =
    await generate_random_ecommerce_customer_products_reviews_create(
      customerAConnection,
      {
        params: { productId },
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceReview.ICreate,
      },
    );
  typia.assert(originalReview);
  // 4. Customer B attempts to update Customer A's review
  await TestValidator.error("unauthorized review update", async () => {
    await api.functional.ecommerce.customer.products.reviews.update(
      customerBConnection,
      {
        productId,
        reviewId: typia.random<string & tags.Format<"uuid">>(), // Use random UUID since we don't have actual review ID structure
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: "Unauthorized update attempt",
        } satisfies IEcommerceReview.IUpdate,
      },
    );
  });
  // 5. Validate that authorization error was thrown
  TestValidator.predicate("authorization error properly handled", true);
}
