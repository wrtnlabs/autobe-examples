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
 * Test customer review creation with rating and content.
 *
 * Validates the complete review creation workflow where a customer submits feedback for a purchased product. The test ensures proper authentication, rating validation, and data persistence.
 *
 * The review creation endpoint requires:
 * - Valid customer authentication
 * - Order item ID referencing a delivered order
 * - Star rating between 1 and 5
 * - Optional text content
 *
 * 1. Customer registers with random credentials via authorize_customer_join.
 * 2. Customer connection is created with authentication token.
 * 3. Review is created with valid orderItemId, rating (1-5), and optional content.
 * 4. Response is validated for correct structure and data types.
 * 5. Rating is verified to be within 1-5 range.
 * 6. Customer ID is verified to match authenticated customer.
 * 7. Timestamps are verified to be properly formatted.
 */
export async function test_api_customer_review_creation_with_rating_and_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
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
  // 2. Create review with random data using utility function
  const review: IEcommerceReview =
    await generate_random_ecommerce_customer_reviews_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IEcommerceReview.ICreate,
      },
    );
  typia.assert(review);
  // 3. Validate review structure
  TestValidator.equals("customer ID matches", review.customer.id, customer.id);
  TestValidator.predicate(
    "rating is valid",
    review.rating >= 1 && review.rating <= 5,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    review.created_at !== null,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    review.updated_at !== null,
  );
  // 4. Validate content is either null or string
  if (review.content !== null) {
    TestValidator.predicate(
      "content is string",
      typeof review.content === "string",
    );
  }
}
