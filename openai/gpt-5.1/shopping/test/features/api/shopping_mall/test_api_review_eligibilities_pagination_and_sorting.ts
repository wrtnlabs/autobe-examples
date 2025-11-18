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
 * Validate pagination and sorting behavior for customer review eligibilities.
 *
 * Business goal Ensure that the customer-facing review eligibility search
 * endpoint (`PATCH /shoppingMall/customer/reviewEligibilities`) correctly
 * implements page/limit pagination and sorting by `eligible_from` when invoked
 * by an authenticated customer, and that it behaves safely when page/limit are
 * omitted or set to null.
 *
 * High-level flow
 *
 * 1. Register a new customer using `POST /auth/customer/join` to obtain an
 *    authenticated customer context and token.
 * 2. With that authenticated connection, call `PATCH
 *    /shoppingMall/customer/reviewEligibilities` multiple times:
 *
 *    - Default sort, page 1 and page 2 with a fixed limit
 *    - Explicit sort on `eligible_from` ascending
 *    - Explicit sort on `eligible_from` descending
 *    - Calls with omitted/null pagination parameters to check default behaviors.
 *
 * Notes about data setup
 *
 * - The SDK surface does not expose any operation to deterministically create
 *   review eligibility records; therefore, the test cannot guarantee a specific
 *   number of eligibilities for the joined customer.
 * - Instead, the test adapts to the existing data volume:
 *
 *   - When there are at least 2 pages, it verifies non-overlap of eligibility IDs
 *       between page 1 and page 2 under the default sort and basic pagination
 *       metadata invariants.
 *   - Sorting assertions (ascending/descending) are performed within a single page
 *       and guarded so they only execute when at least two records are
 *       present.
 *
 * Pagination and sorting checks
 *
 * - Default pagination:
 *
 *   - Request page=1, limit=10 with customer_id scoped to the authenticated
 *       customer and no explicit sort_by.
 *   - Validate that:
 *
 *       - Pagination.current is 1 (or non-negative, depending on implementation) and
 *               pagination.limit >= data.length.
 *       - There are no duplicate IDs within the page.
 *   - If pagination.pages >= 2, request page=2 with the same filter and assert:
 *
 *       - Pagination.current is 2.
 *       - No duplicate IDs within the second page.
 *       - No overlapping eligibility IDs between page 1 and page 2.
 * - Explicit sorting by eligible_from:
 *
 *   - For sort_direction="asc", ensure that the `eligible_from` timestamps in the
 *       returned page are in non-decreasing order.
 *   - For sort_direction="desc", ensure they are in non-increasing order.
 *   - Comparisons rely on ISO 8601 semantics, so lexicographical string comparison
 *       is sufficient.
 * - Pagination defaults / null handling:
 *
 *   - Call without page and limit to confirm that the endpoint responds with a
 *       valid page and coherent pagination metadata.
 *   - Call with page and limit explicitly set to null to validate that null is
 *       accepted (per DTO) and that the server still produces a valid,
 *       non-crashing response.
 */
export async function test_api_review_eligibilities_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const customerId: string & tags.Format<"uuid"> = authorized.id;

  // Helper to call index with a given request body.
  const fetchEligibilities = async (
    body: IShoppingMallReviewEligibility.IRequest,
  ): Promise<IPageIShoppingMallReviewEligibility.ISummary> => {
    const res =
      await api.functional.shoppingMall.customer.reviewEligibilities.index(
        connection,
        { body },
      );
    typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(res);
    return res;
  };

  // 2. Default pagination: page=1, limit=10, no explicit sort_by.
  const page1Request = {
    customer_id: customerId,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallReviewEligibility.IRequest;

  const page1 = await fetchEligibilities(page1Request);
  const page1Data = page1.data;
  const page1Pagination = page1.pagination;

  TestValidator.predicate(
    "page 1 current page index should be non-negative",
    page1Pagination.current >= 0,
  );
  TestValidator.predicate(
    "page 1 limit should be positive",
    page1Pagination.limit > 0,
  );
  TestValidator.predicate(
    "page 1 data length must not exceed limit",
    page1Data.length <= page1Pagination.limit,
  );

  // Ensure no duplicate IDs within page 1.
  const page1Ids = page1Data.map((e) => e.id);
  const uniquePage1Ids = new Set(page1Ids);
  TestValidator.equals(
    "page 1 should not contain duplicate eligibility ids",
    page1Ids.length,
    uniquePage1Ids.size,
  );

  // 3. Second page fetch (page=2) when multiple pages exist.
  if (page1.pagination.pages >= 2) {
    const page2Request = {
      customer_id: customerId,
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      sort_by: null,
      sort_direction: null,
    } satisfies IShoppingMallReviewEligibility.IRequest;

    const page2 = await fetchEligibilities(page2Request);
    const page2Data = page2.data;
    const page2Pagination = page2.pagination;

    TestValidator.equals(
      "page 2 current page index should be 2 when requesting page 2",
      page2Pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit should match requested limit",
      page2Pagination.limit,
      10,
    );
    TestValidator.predicate(
      "page 2 data length must not exceed limit",
      page2Data.length <= page2Pagination.limit,
    );

    const page2Ids = page2Data.map((e) => e.id);
    const uniquePage2Ids = new Set(page2Ids);
    TestValidator.equals(
      "page 2 should not contain duplicate eligibility ids",
      page2Ids.length,
      uniquePage2Ids.size,
    );

    // Verify non-overlap of IDs between page 1 and page 2 when both have data.
    if (page1Ids.length > 0 && page2Ids.length > 0) {
      const set1 = new Set(page1Ids);
      const intersection = page2Ids.filter((id) => set1.has(id));
      TestValidator.equals(
        "page 1 and page 2 should not share eligibility ids",
        intersection.length,
        0,
      );
    }
  }

  // 4. Sorting by eligible_from ascending.
  const sortAscRequest = {
    customer_id: customerId,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "eligible_from",
    sort_direction: "asc",
  } satisfies IShoppingMallReviewEligibility.IRequest;

  const ascPage = await fetchEligibilities(sortAscRequest);
  const ascData = ascPage.data;

  if (ascData.length >= 2) {
    for (let i = 0; i < ascData.length - 1; i++) {
      const cur = ascData[i]!.eligible_from;
      const next = ascData[i + 1]!.eligible_from;
      TestValidator.predicate(
        `eligible_from ascending order at index ${i}`,
        cur <= next,
      );
    }
  }

  // 5. Sorting by eligible_from descending.
  const sortDescRequest = {
    customer_id: customerId,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "eligible_from",
    sort_direction: "desc",
  } satisfies IShoppingMallReviewEligibility.IRequest;

  const descPage = await fetchEligibilities(sortDescRequest);
  const descData = descPage.data;

  if (descData.length >= 2) {
    for (let i = 0; i < descData.length - 1; i++) {
      const cur = descData[i]!.eligible_from;
      const next = descData[i + 1]!.eligible_from;
      TestValidator.predicate(
        `eligible_from descending order at index ${i}`,
        cur >= next,
      );
    }
  }

  // 6. Pagination defaults: omit page and limit.
  const defaultPageRequest = {
    customer_id: customerId,
  } satisfies IShoppingMallReviewEligibility.IRequest;

  const defaultPage = await fetchEligibilities(defaultPageRequest);
  TestValidator.predicate(
    "default pagination current index should be non-negative",
    defaultPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "default pagination limit should be positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default pagination data length must not exceed limit",
    defaultPage.data.length <= defaultPage.pagination.limit,
  );

  // 7. Explicit null page/limit handling.
  const nullPageRequest = {
    customer_id: customerId,
    page: null,
    limit: null,
  } satisfies IShoppingMallReviewEligibility.IRequest;

  const nullPage = await fetchEligibilities(nullPageRequest);
  TestValidator.predicate(
    "null page/limit pagination current index should be non-negative",
    nullPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "null page/limit pagination limit should be positive",
    nullPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "null page/limit data length must not exceed limit",
    nullPage.data.length <= nullPage.pagination.limit,
  );
}
