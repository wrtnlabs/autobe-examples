import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewEligibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewEligibility";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewEligibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewEligibility";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Filter review eligibilities by status for an authenticated customer.
 *
 * ## Business intent
 *
 * Validate that the customer-scoped search endpoint PATCH
 * /shoppingMall/customer/reviewEligibilities correctly applies the `status`
 * filter in IShoppingMallReviewEligibility.IRequest and returns only
 * eligibilities whose `status` field matches the requested value. Also perform
 * a lightweight sanity check on pagination metadata.
 *
 * ## Underlying constraints
 *
 * Only two SDK entrypoints are available for this scenario:
 *
 * - Auth.customer.join (customer registration + authentication)
 * - ShoppingMall.customer.reviewEligibilities.index (eligibility search)
 *
 * There is no API in scope to create orders, order items, or eligibilities
 * themselves, so this test relies on whatever data is present in the backend
 * (or on Nestia simulator random data). The test therefore:
 *
 * - Always verifies type-safety of responses
 * - Applies status filtering only when we can discover at least one concrete
 *   status value from an initial unfiltered query
 * - Optionally exercises a second distinct status when available
 * - Skips non-implementable parts of the original lifecycle scenario (purchase
 *   flows, explicit review creation) while still validating the filtering
 *   behavior of the endpoint itself.
 *
 * ## High-level flow
 *
 * 1. Register a new shopping mall customer via auth.customer.join. This
 *    establishes an authenticated customer connection; token handling is done
 *    by the SDK.
 * 2. Perform a baseline unfiltered search using
 *    shoppingMall.customer.reviewEligibilities.index with a simple pagination
 *    request (page=1, limit small), leaving filters such as customer_id,
 *    product_id, sku_id, status, and date ranges omitted.
 *
 *    - Assert the response structure using typia.assert.
 *    - Extract any existing eligibility summaries from the data array.
 * 3. If the baseline query returns no data:
 *
 *    - Only verify that pagination metadata is consistent with the empty result set
 *         and finish, as no status filtering can be demonstrated without sample
 *         data.
 * 4. If at least one eligibility exists:
 *
 *    - Collect the set of distinct status strings present in the baseline page
 *         (using simple iteration).
 *    - Choose the first status as statusA.
 * 5. Call the index endpoint again with body.status = statusA and the same
 *    pagination parameters.
 *
 *    - Assert the response type.
 *    - For every eligibility in data, assert that summary.status exactly equals
 *         statusA.
 * 6. If there is a second distinct status in the original sample, choose it as
 *    statusB and repeat step 5 for statusB.
 *
 * This test does not attempt to validate error handling for invalid status
 * strings, nor does it verify HTTP status codes directly. Instead, it focuses
 * purely on the business-visible behavior of the status filter given valid
 * inputs and the available SDK surface.
 */
export async function test_api_review_eligibilities_filter_by_status(
  connection: api.IConnection,
) {
  // 1. Register a new customer and establish authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Baseline unfiltered eligibility search (page 1, small limit).
  const baselineBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallReviewEligibility.IRequest;

  const baselinePage: IPageIShoppingMallReviewEligibility.ISummary =
    await api.functional.shoppingMall.customer.reviewEligibilities.index(
      connection,
      {
        body: baselineBody,
      },
    );
  typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(baselinePage);

  // Basic pagination sanity check for baseline response.
  const baselinePagination = baselinePage.pagination;
  TestValidator.predicate(
    "baseline pagination: limit non-negative and >= data length",
    baselinePagination.limit >= 0 &&
      baselinePage.data.length <= baselinePagination.limit,
  );
  TestValidator.predicate(
    "baseline pagination: current page within [0, pages]",
    baselinePagination.current >= 0 &&
      baselinePagination.current <= baselinePagination.pages,
  );

  // If no eligibilities were returned, we cannot meaningfully test
  // status filtering; finish after pagination checks.
  if (baselinePage.data.length === 0) return;

  // 3. Derive distinct status values from the baseline data.
  const statuses: string[] = [];
  for (const summary of baselinePage.data) {
    if (!statuses.includes(summary.status)) statuses.push(summary.status);
  }
  if (statuses.length === 0) return; // defensive: should not happen if data.length > 0

  const statusA: string = statuses[0];

  // 4. Filter by the first discovered status and verify all results.
  const statusABody = {
    status: statusA,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallReviewEligibility.IRequest;

  const statusAPage: IPageIShoppingMallReviewEligibility.ISummary =
    await api.functional.shoppingMall.customer.reviewEligibilities.index(
      connection,
      {
        body: statusABody,
      },
    );
  typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(statusAPage);

  for (const summary of statusAPage.data) {
    TestValidator.equals(
      "all eligibilities in statusA page must match requested status",
      summary.status,
      statusA,
    );
  }

  // 5. If a second distinct status exists, repeat the test for it.
  if (statuses.length >= 2) {
    const statusB: string = statuses[1];
    const statusBBody = {
      status: statusB,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallReviewEligibility.IRequest;

    const statusBPage: IPageIShoppingMallReviewEligibility.ISummary =
      await api.functional.shoppingMall.customer.reviewEligibilities.index(
        connection,
        {
          body: statusBBody,
        },
      );
    typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(statusBPage);

    for (const summary of statusBPage.data) {
      TestValidator.equals(
        "all eligibilities in statusB page must match requested status",
        summary.status,
        statusB,
      );
    }

    // Optional: if both filtered result sets are non-empty, ensure
    // that at least one id differs between them to demonstrate
    // that different statuses produce different subsets.
    if (statusAPage.data.length > 0 && statusBPage.data.length > 0) {
      const idsA = statusAPage.data.map((s) => s.id);
      const idsB = statusBPage.data.map((s) => s.id);
      const hasDifferentId = idsA.some((id) => !idsB.includes(id));
      TestValidator.predicate(
        "statusA and statusB result sets should not be identical when both non-empty",
        hasDifferentId || idsA.length === 0 || idsB.length === 0,
      );
    }
  }
}
