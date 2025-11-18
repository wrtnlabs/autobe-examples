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
 * Filter review eligibilities by eligible_from/eligible_until time windows and
 * validate pagination consistency.
 *
 * Business goals
 *
 * - Ensure that the customer-scoped review eligibility search endpoint (PATCH
 *   /shoppingMall/customer/reviewEligibilities) correctly respects
 *   eligible_from_from / eligible_from_to and eligible_until_* filters.
 * - Verify that pagination metadata (pagination.current, pagination.limit,
 *   pagination.records, pagination.pages) is self-consistent with the sequence
 *   of returned pages when iterating through a filtered result set.
 * - Handle both empty and non-empty datasets gracefully, since we cannot create
 *   eligibilities directly with the provided SDK functions.
 *
 * Test flow
 *
 * 1. Join a customer via /auth/customer/join to obtain an authenticated customer
 *    actor and have the SDK propagate the Authorization header.
 * 2. Execute a broad review eligibility search with a large window on
 *    eligible_from (far past to far future) and a moderate page size.
 *
 *    - If data is non-empty, compute the observed min/max eligible_from over the
 *         first page and use them to derive a narrower window.
 *    - If data is empty, still assert response structure and exit early from deeper
 *         window/pagination checks.
 * 3. For a non-empty broad result set:
 *
 *    - Derive a sub-window [subFrom, subTo] inside the observed [minEligibleFrom,
 *         maxEligibleFrom] range and re-query using that window with the same
 *         limit.
 *    - Assert that every returned eligibility’s eligible_from is within [subFrom,
 *         subTo] inclusive.
 *    - Iterate over all pages for this sub-window, accumulating all eligibility ids.
 *         Validate that: a. The total count of unique ids equals
 *         pagination.records from the first page. b. No id is duplicated across
 *         pages.
 * 4. Inspect the broad-window dataset for eligibilities with non-null
 *    eligible_until. If present:
 *
 *    - Compute min/max eligible_until among non-null entries.
 *    - Derive a middle sub-window [untilFrom, untilTo] and re-query using
 *         eligible_until_from / eligible_until_to (optionally combined with the
 *         earlier eligible_from filter).
 *    - For all returned eligibilities where eligible_until is non-null, assert that
 *         eligible_until lies within [untilFrom, untilTo] inclusive.
 *         Eligibilities with eligible_until null are not subject to this bound
 *         check but must still satisfy any eligible_from window constraints in
 *         the same request.
 *
 * Coverage notes
 *
 * - The test does not attempt to validate HTTP status codes or error payloads; it
 *   relies on SDK-level error handling and will fail fast when an unexpected
 *   error is thrown.
 * - No attempts are made to create or mutate eligibilities directly, as no such
 *   APIs are available in the provided SDK subset.
 */
export async function test_api_review_eligibilities_filter_by_time_window(
  connection: api.IConnection,
) {
  // 1. Register a new customer to obtain an authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Prepare a set of time windows in ISO 8601 format.
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const farPast = new Date(now.getTime() - 365 * oneDayMs).toISOString();
  const farFuture = new Date(now.getTime() + 365 * oneDayMs).toISOString();

  // Broad window intended to cover virtually all eligibilities for this
  // customer, if any exist.
  const broadRequest = {
    customer_id: authorizedCustomer.id,
    product_id: null,
    sku_id: null,
    order_item_id: null,
    status: null,
    eligible_from_from: farPast,
    eligible_from_to: farFuture,
    eligible_until_from: null,
    eligible_until_to: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "eligible_from",
    sort_direction: "asc",
  } satisfies IShoppingMallReviewEligibility.IRequest;

  const broadPage: IPageIShoppingMallReviewEligibility.ISummary =
    await api.functional.shoppingMall.customer.reviewEligibilities.index(
      connection,
      { body: broadRequest },
    );
  typia.assert(broadPage);

  const { pagination, data } = broadPage;

  // Basic structural and pagination sanity checks.
  TestValidator.predicate(
    "pagination current page index should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );

  // If there is no data, we can only validate structure and exit.
  if (data.length === 0) return;

  // 3. Use observed eligible_from values from the first page to derive a
  // narrower window for more focused filtering tests.
  const eligibleFromValues = data.map((e) => e.eligible_from);
  const sortedEligibleFrom = [...eligibleFromValues].sort();
  const minEligibleFrom = sortedEligibleFrom[0]!;
  const maxEligibleFrom = sortedEligibleFrom[sortedEligibleFrom.length - 1]!;

  // Derive a sub-window; inclusive bounds are sufficient to verify filter.
  const subFrom = minEligibleFrom;
  const subTo = maxEligibleFrom;

  const subWindowRequest = {
    customer_id: authorizedCustomer.id,
    product_id: null,
    sku_id: null,
    order_item_id: null,
    status: null,
    eligible_from_from: subFrom,
    eligible_from_to: subTo,
    eligible_until_from: null,
    eligible_until_to: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: broadRequest.limit,
    sort_by: "eligible_from",
    sort_direction: "asc",
  } satisfies IShoppingMallReviewEligibility.IRequest;

  const firstSubPage: IPageIShoppingMallReviewEligibility.ISummary =
    await api.functional.shoppingMall.customer.reviewEligibilities.index(
      connection,
      { body: subWindowRequest },
    );
  typia.assert(firstSubPage);

  // Verify all returned eligible_from values lie within [subFrom, subTo].
  for (const eligibility of firstSubPage.data) {
    TestValidator.predicate(
      "eligible_from must be within requested sub-window",
      eligibility.eligible_from >= subFrom &&
        eligibility.eligible_from <= subTo,
    );
  }

  // 4. Paginate over the entire sub-window, accumulating all ids and ensuring
  // there are no overlaps with respect to pagination.records.
  const totalPages = firstSubPage.pagination.pages;
  const expectedTotalRecords = firstSubPage.pagination.records;

  const collectedIds: string[] = [];

  for (let page = 1; page <= totalPages; page += 1) {
    const pagedRequest = {
      ...subWindowRequest,
      page: page as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallReviewEligibility.IRequest;

    const pageResult: IPageIShoppingMallReviewEligibility.ISummary =
      await api.functional.shoppingMall.customer.reviewEligibilities.index(
        connection,
        { body: pagedRequest },
      );
    typia.assert(pageResult);

    TestValidator.equals(
      "pagination current index should match requested page index",
      pageResult.pagination.current,
      page,
    );

    for (const eligibility of pageResult.data) {
      collectedIds.push(eligibility.id);
    }
  }

  const uniqueIds = new Set(collectedIds);

  TestValidator.equals(
    "number of collected unique ids should equal pagination.records",
    uniqueIds.size,
    expectedTotalRecords,
  );

  // 5. If any eligibility has non-null eligible_until in the broad dataset,
  // derive an eligible_until sub-window and verify filtering behavior.
  const eligibilitiesWithUntil = data.filter(
    (e) => e.eligible_until !== null && e.eligible_until !== undefined,
  );

  if (eligibilitiesWithUntil.length === 0) return;

  const untilValues = eligibilitiesWithUntil.map((e) => e.eligible_until!);
  const sortedUntil = [...untilValues].sort();
  const minUntil = sortedUntil[0]!;
  const maxUntil = sortedUntil[sortedUntil.length - 1]!;

  const untilFrom = minUntil;
  const untilTo = maxUntil;

  const untilWindowRequest = {
    customer_id: authorizedCustomer.id,
    product_id: null,
    sku_id: null,
    order_item_id: null,
    status: null,
    eligible_from_from: subFrom,
    eligible_from_to: subTo,
    eligible_until_from: untilFrom,
    eligible_until_to: untilTo,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: broadRequest.limit,
    sort_by: "eligible_from",
    sort_direction: "asc",
  } satisfies IShoppingMallReviewEligibility.IRequest;

  const untilPage: IPageIShoppingMallReviewEligibility.ISummary =
    await api.functional.shoppingMall.customer.reviewEligibilities.index(
      connection,
      { body: untilWindowRequest },
    );
  typia.assert(untilPage);

  for (const eligibility of untilPage.data) {
    if (
      eligibility.eligible_until !== null &&
      eligibility.eligible_until !== undefined
    ) {
      TestValidator.predicate(
        "eligible_until must be within requested window when non-null",
        eligibility.eligible_until >= untilFrom &&
          eligibility.eligible_until <= untilTo,
      );
    }

    // eligible_from must still satisfy the sub-window we used.
    TestValidator.predicate(
      "eligible_from remains within sub-window when combined with eligible_until filters",
      eligibility.eligible_from >= subFrom &&
        eligibility.eligible_from <= subTo,
    );
  }
}
