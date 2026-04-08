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

/**
 * Test customer review retrieval by unique identifier.
 *
 * Validates that an authenticated customer can successfully retrieve a review by its UUID. The test ensures the review endpoint returns complete review data including all nested references (customer, orderItem, product) and validates the response structure matches the IEcommerceReview type definition.
 *
 * This test covers the primary success path for viewing product reviews on product detail pages, verifying that the GET /ecommerce/customer/reviews/{reviewId} endpoint works correctly with proper customer authentication.
 *
 * 1. Customer authenticates via join operation using authorize_customer_join utility function.
 * 2. Review UUID is generated with valid UUID format.
 * 3. GET request retrieves the review with all fields populated.
 * 4. Response validation ensures all review fields are present and correctly typed.
 * 5. Business logic validation confirms rating is within 1-5 range and timestamps are valid.
 */
export async function test_api_review_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate valid review UUID
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve review
  const review: IEcommerceReview =
    await api.functional.ecommerce.customer.reviews.at(customerConnection, {
      reviewId,
    });
  typia.assert(review);
  // 4. Validate review structure
  TestValidator.equals("review id matches", review.id, reviewId);
  TestValidator.predicate(
    "rating is valid",
    review.rating >= 1 && review.rating <= 5,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      review.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      review.updated_at,
    ),
  );
  // 5. Validate nested references exist
  TestValidator.predicate(
    "customer reference exists",
    review.customer !== null && review.customer !== undefined,
  );
  TestValidator.predicate(
    "orderItem reference exists",
    review.orderItem !== null && review.orderItem !== undefined,
  );
  TestValidator.predicate(
    "product reference exists",
    review.product !== null && review.product !== undefined,
  );
  // 6. Validate customer summary fields
  TestValidator.predicate(
    "customer has valid id",
    /^[0-9a-f-]{36}$/i.test(review.customer.id),
  );
  TestValidator.predicate(
    "customer has display name",
    review.customer.display_name.length > 0,
  );
  // 7. Validate orderItem summary fields
  TestValidator.predicate(
    "orderItem has valid id",
    /^[0-9a-f-]{36}$/i.test(review.orderItem.id),
  );
  TestValidator.predicate(
    "orderItem has valid quantity",
    review.orderItem.quantity >= 1,
  );
  // 8. Validate product summary fields
  TestValidator.predicate(
    "product has valid id",
    /^[0-9a-f-]{36}$/i.test(review.product.id),
  );
  TestValidator.predicate("product has name", review.product.name.length > 0);
}
