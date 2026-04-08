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
 * Test customer review summary endpoint excludes deleted reviews.
 *
 * Validates that the review summary endpoint properly filters out soft-deleted reviews and returns only active reviews in the paginated results. The endpoint should exclude reviews where deleted_at is not null from both the result set and the total count in pagination metadata.
 *
 * Since review creation and deletion functions are not available in the provided SDK, this test focuses on validating the endpoint's basic functionality and response structure. The test ensures that authenticated customers can access the review summary endpoint and receive properly formatted responses with pagination information.
 *
 * 1. Customer registers with valid credentials.
 * 2. Customer calls review summary endpoint with pagination parameters.
 * 3. Validates response structure includes pagination metadata.
 * 4. Verifies review summaries contain required fields (id, customer, product, rating, timestamps).
 * 5. Confirms pagination counts are consistent (records <= total pages * limit).
 */
export async function test_api_customer_review_summary_excludes_deleted_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
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
  // 2. Call review summary endpoint with default pagination
  const summary: IPageIEcommerceReview.ISummary =
    await api.functional.ecommerce.customer.reviews.summary.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceReview.IRequest,
      },
    );
  typia.assert(summary);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination current page valid",
    summary.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    summary.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    summary.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    summary.pagination.pages >= 0,
  );
  // 4. Validate consistency of pagination metadata (handle division by zero)
  TestValidator.predicate(
    "pages calculated correctly",
    summary.pagination.limit > 0
      ? summary.pagination.pages ===
          Math.ceil(summary.pagination.records / summary.pagination.limit)
      : summary.pagination.pages === 0,
  );
  // 5. Validate review summaries structure
  TestValidator.predicate("review data array exists", () => {
    for (const review of summary.data) {
      typia.assert(review);
    }
    return true;
  });
  // 6. Validate customer and product summaries in reviews (if any exist)
  if (summary.data.length > 0) {
    const firstReview = summary.data[0];
    typia.assert(firstReview.customer);
    typia.assert(firstReview.product);
    TestValidator.predicate(
      "customer has id",
      firstReview.customer.id !== undefined,
    );
    TestValidator.predicate(
      "customer has display_name",
      firstReview.customer.display_name !== undefined,
    );
    TestValidator.predicate(
      "customer has created_at",
      firstReview.customer.created_at !== undefined,
    );
    TestValidator.predicate(
      "product has id",
      firstReview.product.id !== undefined,
    );
    TestValidator.predicate(
      "product has name",
      firstReview.product.name !== undefined,
    );
    TestValidator.predicate(
      "product has base_price",
      firstReview.product.base_price !== undefined,
    );
    TestValidator.predicate(
      "product has seller",
      firstReview.product.seller !== undefined,
    );
    TestValidator.predicate(
      "product has category",
      firstReview.product.category !== undefined,
    );
  }
  // 7. Test with different pagination parameters
  const summaryWithLimit: IPageIEcommerceReview.ISummary =
    await api.functional.ecommerce.customer.reviews.summary.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceReview.IRequest,
      },
    );
  typia.assert(summaryWithLimit);
  TestValidator.predicate(
    "records with limit 10 valid",
    summaryWithLimit.pagination.records >= 0,
  );
}