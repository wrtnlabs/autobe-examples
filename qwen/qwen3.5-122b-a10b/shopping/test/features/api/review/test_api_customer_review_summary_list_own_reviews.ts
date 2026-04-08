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
 * Test customer review summary list retrieval with authentication and pagination.
 *
 * Validates that a registered customer can successfully retrieve their own review summaries through the PATCH /ecommerce/customer/reviews/summary endpoint. The test ensures proper authentication, pagination metadata, review summary structure, and sorting order.
 *
 * The workflow includes customer registration, review summary retrieval with filtering and pagination, and comprehensive validation of the response structure and business logic.
 *
 * 1. Register a new customer account with randomized credentials.
 * 2. Create customer-specific connection with authentication token.
 * 3. Call review summary list endpoint with customer_id filter and pagination.
 * 4. Validate pagination metadata (current page, limit, total records, total pages).
 * 5. Validate each review summary contains required fields (id, customer, product, rating, content, timestamps).
 * 6. Verify reviews are sorted by created_at in descending order (newest first).
 * 7. Confirm only the authenticated customer's reviews appear in results.
 */
export async function test_api_customer_review_summary_list_own_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceCustomer.IAuthorized =
    await api.functional.ecommerce.auth.customer.join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Create customer-specific connection with auth token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: customer.token.access,
    },
  };
  // 3. Call review summary list endpoint with customer_id filter and pagination
  const reviewSummaryList: IPageIEcommerceReview.ISummary =
    await api.functional.ecommerce.customer.reviews.summary.index(
      authenticatedConnection,
      {
        body: {
          customer_id: customer.id,
          page: 1,
          limit: 20,
          sort: "created_at DESC",
        } satisfies IEcommerceReview.IRequest,
      },
    );
  typia.assert(reviewSummaryList);
  // 4. Validate pagination metadata
  TestValidator.equals("current page", reviewSummaryList.pagination.current, 1);
  TestValidator.equals("limit", reviewSummaryList.pagination.limit, 20);
  TestValidator.predicate(
    "total records non-negative",
    reviewSummaryList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    reviewSummaryList.pagination.pages >= 0,
  );
  // 5. Validate review summary structure if reviews exist
  if (reviewSummaryList.data.length > 0) {
    // Validate first review summary structure
    const firstReview = reviewSummaryList.data[0];
    typia.assert(firstReview);
    TestValidator.equals(
      "review has valid id",
      typeof firstReview.id,
      "string",
    );
    TestValidator.predicate(
      "review has valid rating",
      firstReview.rating >= 1 && firstReview.rating <= 5,
    );
    TestValidator.predicate(
      "review has valid created_at",
      typeof firstReview.created_at === "string",
    );
    TestValidator.predicate(
      "review has valid updated_at",
      typeof firstReview.updated_at === "string",
    );
    // Validate customer reference
    TestValidator.equals(
      "review customer id matches",
      firstReview.customer.id,
      customer.id,
    );
    // Validate product reference exists
    TestValidator.predicate(
      "review has product reference",
      firstReview.product !== null && firstReview.product !== undefined,
    );
    // 6. Verify sorting order (created_at DESC - newest first)
    for (let i = 1; i < reviewSummaryList.data.length; i++) {
      const previous = reviewSummaryList.data[i - 1];
      const current = reviewSummaryList.data[i];
      TestValidator.predicate(
        `review ${i} is older than review ${i - 1}`,
        new Date(current.created_at) <= new Date(previous.created_at),
      );
    }
  }
  // 7. Test with different pagination parameters
  const reviewSummaryListPage2: IPageIEcommerceReview.ISummary =
    await api.functional.ecommerce.customer.reviews.summary.index(
      authenticatedConnection,
      {
        body: {
          customer_id: customer.id,
          page: 2,
          limit: 10,
        } satisfies IEcommerceReview.IRequest,
      },
    );
  typia.assert(reviewSummaryListPage2);
  TestValidator.equals(
    "page 2 current",
    reviewSummaryListPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit",
    reviewSummaryListPage2.pagination.limit,
    10,
  );
}
