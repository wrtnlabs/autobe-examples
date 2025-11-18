import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewHelpfulVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewHelpfulVote";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallReviewHelpfulVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewHelpfulVote";

/**
 * Verify helpful vote search returns an empty page for a new customer with no
 * history.
 *
 * Business goal: Ensure that when a freshly-registered customer with no helpful
 * vote records calls the customer-scoped helpfulVotes search endpoint, the API
 * responds with a valid pagination object that reflects zero records and an
 * empty data array, without leaking other customers' data.
 *
 * End-to-end steps:
 *
 * 1. Register a new customer via POST /auth/customer/join.
 *
 *    - Use typia.random<IShoppingMallCustomerJoin.IRequest>() to produce a valid
 *         join payload.
 *    - Capture the returned IShoppingMallCustomer.IAuthorized, which includes the
 *         new customer's id and an authorization token. The SDK also wires the
 *         access token onto connection.headers.Authorization.
 * 2. Do not create any reviews or helpful votes for this customer to keep their
 *    shopping_mall_review_helpful_votes history empty.
 * 3. Call PATCH /shoppingMall/customer/customers/{customerId}/helpfulVotes via
 *    api.functional.shoppingMall.customer.customers.helpfulVotes.index using:
 *
 *    - CustomerId path parameter = authorizedCustomer.id.
 *    - Body of type IShoppingMallReviewHelpfulVote.IRequest with deterministic
 *         pagination and filter values, such as: { page: 1, limit: 10, sortBy:
 *         "created_at", sortDirection: "desc", customerId:
 *         authorizedCustomer.id }
 * 4. Validate the response IPageIShoppingMallReviewHelpfulVote.ISummary:
 *
 *    - Typia.assert(output) for full structural validation.
 *    - Pagination.records must be 0.
 *    - Data.length must be 0.
 *    - Pagination.current should equal the requested page (1).
 *    - Pagination.limit should equal the requested limit (10).
 *    - Pagination.pages may be 0 or 1 for an empty result; accept either but ensure
 *         it is not greater than 1.
 *
 * These checks collectively verify that the endpoint is callable for customers
 * without helpful vote history, that pagination metadata correctly reflects the
 * absence of records, and that no other customers' helpful votes leak into the
 * response.
 */
export async function test_api_customer_helpful_votes_search_empty_result_for_customer_without_votes(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join) and obtain an authorized customer context
  const joinRequest = typia.random<IShoppingMallCustomerJoin.IRequest>();

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinRequest,
    });
  typia.assert(customer);

  // 2. Do NOT create any reviews or helpful votes for this customer.
  //    We rely on the freshly created account having no helpful vote history.

  // 3. Call the helpfulVotes index endpoint with deterministic pagination.
  const requestBody = {
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortDirection: "desc",
    customerId: customer.id,
  } satisfies IShoppingMallReviewHelpfulVote.IRequest;

  const page: IPageIShoppingMallReviewHelpfulVote.ISummary =
    await api.functional.shoppingMall.customer.customers.helpfulVotes.index(
      connection,
      {
        customerId: customer.id,
        body: requestBody,
      },
    );

  // 4. Validate response structure and empty pagination semantics.
  typia.assert(page);

  const pagination: IPage.IPagination = page.pagination;

  // Business-logic assertions
  TestValidator.equals(
    "helpfulVotes records should be zero for a new customer",
    pagination.records,
    0,
  );

  TestValidator.equals(
    "helpfulVotes page data length should be zero for a new customer",
    page.data.length,
    0,
  );

  TestValidator.equals(
    "current page matches requested page",
    pagination.current,
    1,
  );

  TestValidator.equals(
    "page limit matches requested limit",
    pagination.limit,
    10,
  );

  // pages may be 0 or 1 depending on implementation, but must not exceed 1
  TestValidator.predicate(
    "pages count for empty result should be 0 or 1",
    pagination.pages === 0 || pagination.pages === 1,
  );
}
