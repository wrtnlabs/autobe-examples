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
 * Verify that customer helpful-vote search requires authentication.
 *
 * Business context: Customer helpful-vote search (PATCH
 * /shoppingMall/customer/customers/{customerId}/helpfulVotes) is a
 * customer-actor-scoped read/search endpoint that should never be callable
 * anonymously. Even if a valid customer account exists and its UUID is known,
 * the backend must still enforce that the caller is an authenticated customer
 * (with a valid Authorization header) before returning any helpful-vote
 * activity data.
 *
 * This test validates that behavior by:
 *
 * 1. Creating a real customer via the join flow to obtain a real customerId.
 * 2. Constructing a clean, unauthenticated connection that does not carry
 *    Authorization.
 * 3. Calling the helpful-vote search endpoint with a minimal but valid search body
 *    using that unauthenticated connection.
 * 4. Asserting that the call fails with an authorization error (some HttpError)
 *    instead of returning a normal page of helpful-vote summaries.
 *
 * Scenario steps:
 *
 * 1. Arrange - register a customer and prepare search criteria
 *
 *    - Call api.functional.auth.customer.join with a valid
 *         IShoppingMallCustomerJoin.IRequest to create a customer and get an
 *         IShoppingMallCustomer.IAuthorized response.
 *    - Extract the customer.id as a concrete UUID that surely exists.
 *    - Build a minimal search request body object satisfying
 *         IShoppingMallReviewHelpfulVote.IRequest with page and limit set to
 *         small positive integers and all other fields left undefined.
 *    - Clone the original connection into a new local variable that has an empty
 *         headers object so that no Authorization header is sent by the
 *         following call. This new connection must not be used for the join
 *         step—only for the unauthenticated search.
 * 2. Act - attempt helpful-vote search without auth
 *
 *    - Call api.functional.shoppingMall.customer.customers.helpfulVotes.index with
 *         the unauthenticated connection, passing the real customerId and the
 *         minimal search body.
 *    - Wrap this in a TestValidator.error block so that the test expects an
 *         exception instead of a normal response.
 * 3. Assert - verify that an error is thrown
 *
 *    - Use await TestValidator.error("...", async () => { ... }) to assert that
 *         calling index throws. Global rules prohibit asserting on specific
 *         HTTP status codes, so the validation is limited to the existence of
 *         an error rather than checking for 401.
 *    - Do not call typia.assert on the result of index because success is not
 *         expected in this scenario; the entire point is to ensure that a
 *         normal result is never produced when unauthenticated.
 */
export async function test_api_customer_helpful_votes_search_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Arrange - register customer via join to get a real customerId
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null satisfies
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer = await api.functional.auth.customer.join(connection, {
    body: joinRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // Build a valid minimal helpful-vote search request body
  const searchRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallReviewHelpfulVote.IRequest;

  // Create an unauthenticated connection by cloning the base connection but
  // overriding headers with an empty object so that no Authorization header
  // is sent by the following call.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Act & 3. Assert - the helpful-vote search must fail without auth
  await TestValidator.error(
    "customer helpful-vote search without auth must fail",
    async () => {
      await api.functional.shoppingMall.customer.customers.helpfulVotes.index(
        unauthenticatedConnection,
        {
          customerId: customer.id,
          body: searchRequest,
        },
      );
    },
  );
}
