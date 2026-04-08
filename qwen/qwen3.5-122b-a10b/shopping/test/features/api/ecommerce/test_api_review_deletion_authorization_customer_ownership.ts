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
 * Test customer review deletion authorization based on ownership.
 *
 * Validates that only the review owner can delete their review by testing unauthorized deletion attempts. Ensures proper authorization enforcement prevents customers from modifying other customers' reviews.
 *
 * The test creates two customer accounts, has one customer create a review, then attempts deletion by the other customer to verify 403 Forbidden response.
 *
 * 1. Register customer A (attempting unauthorized deletion)
 * 2. Register customer B (review owner)
 * 3. Customer B creates a review for a delivered order item
 * 4. Customer A attempts to delete customer B's review
 * 5. Verify 403 Forbidden error is returned
 * 6. Confirm authorization check prevents unauthorized review modifications
 */
export async function test_api_review_deletion_authorization_customer_ownership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer A (attempting unauthorized deletion)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Register customer B (review owner)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3. Customer B creates a review
  const review = await generate_random_ecommerce_customer_reviews_create(
    customerBConnection,
    {},
  );
  typia.assert(review);
  // 4. Customer A attempts to delete customer B's review (should fail with 403)
  await TestValidator.httpError(
    "unauthorized deletion should return 403 Forbidden",
    403,
    async () => {
      await api.functional.ecommerce.customer.reviews.erase(
        customerAConnection,
        {
          reviewId: review.id,
        },
      );
    },
  );
}
