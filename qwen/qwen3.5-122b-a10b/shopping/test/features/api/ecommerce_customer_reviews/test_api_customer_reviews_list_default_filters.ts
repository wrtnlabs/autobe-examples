import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer reviews list retrieval with default filters and sorting.
 *
 * Validates that authenticated customers can retrieve their paginated review history with default filtering applied. The endpoint returns reviews sorted by creation date in descending order (newest first) and excludes soft-deleted reviews by default.
 *
 * The test verifies the complete response structure including pagination metadata and review summaries. When no reviews exist for a customer, the endpoint should return an empty data array with appropriate pagination values (current=1, records=0, pages=0).
 *
 * 1. Create and authenticate a new customer account.
 * 2. Call the reviews list endpoint with empty request body for default filters.
 * 3. Validate pagination metadata structure and values.
 * 4. Validate empty data array when customer has no reviews.
 * 5. Verify response type matches IPageIEcommerceReview.ISummary schema.
 */
export async function test_api_customer_reviews_list_default_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a customer
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
  // 2. Retrieve customer reviews with default filters (empty request body)
  const reviewsResponse: IPageIEcommerceReview.ISummary =
    await api.functional.ecommerce.customer.reviews.index(customerConnection, {
      body: {},
    });
  typia.assert(reviewsResponse);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page is 1",
    reviewsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    reviewsResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records count",
    reviewsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0 when no records",
    reviewsResponse.pagination.pages,
    0,
  );
  // 4. Validate empty data array when no reviews exist
  TestValidator.equals("data array is empty", reviewsResponse.data.length, 0);
}
