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

export async function test_api_review_eligibilities_basic_customer_scope(
  connection: api.IConnection,
) {
  // 1. Join as a new customer and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional; let server derive it by omitting
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Call reviewEligibilities.index with minimal/default request body
  const defaultRequestBody = {
    // All filters omitted to rely on service defaults
  } satisfies IShoppingMallReviewEligibility.IRequest;

  const defaultPage: IPageIShoppingMallReviewEligibility.ISummary =
    await api.functional.shoppingMall.customer.reviewEligibilities.index(
      connection,
      {
        body: defaultRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(defaultPage);

  // 2-1. Basic pagination invariants
  const defaultPagination = defaultPage.pagination;
  typia.assert<IPage.IPagination>(defaultPagination);

  TestValidator.predicate(
    "default pagination current page must be non-negative",
    defaultPagination.current >= 0,
  );
  TestValidator.predicate(
    "default pagination limit must be positive",
    defaultPagination.limit > 0,
  );
  TestValidator.predicate(
    "default pagination records must be non-negative",
    defaultPagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination pages must be non-negative",
    defaultPagination.pages >= 0,
  );
  TestValidator.predicate(
    "default pagination records do not exceed pages * limit",
    defaultPagination.pages === 0
      ? defaultPagination.records === 0
      : defaultPagination.records <=
          defaultPagination.pages * defaultPagination.limit,
  );

  // 2-2. Ensure every eligibility (if any) belongs to authenticated customer
  await ArrayUtil.asyncForEach(defaultPage.data, async (eligibility, index) => {
    typia.assert<IShoppingMallReviewEligibility.ISummary>(eligibility);
    TestValidator.equals(
      `eligibility[${index}].customer.id must match authenticated customer id`,
      eligibility.customer.id,
      customer.id,
    );
  });

  // 3. Call reviewEligibilities.index with explicit pagination parameters
  const explicitPageNumber = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const explicitLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  const explicitRequestBody = {
    page: explicitPageNumber,
    limit: explicitLimit,
  } satisfies IShoppingMallReviewEligibility.IRequest;

  const explicitPage: IPageIShoppingMallReviewEligibility.ISummary =
    await api.functional.shoppingMall.customer.reviewEligibilities.index(
      connection,
      {
        body: explicitRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallReviewEligibility.ISummary>(explicitPage);

  const explicitPagination = explicitPage.pagination;
  typia.assert<IPage.IPagination>(explicitPagination);

  // Note: Pagination.current is defined as Minimum<0>, but request page is Minimum<1>.
  // Service may normalize to 0-based or 1-based index; only assert non-negative
  TestValidator.predicate(
    "explicit pagination current page must be non-negative",
    explicitPagination.current >= 0,
  );

  TestValidator.predicate(
    "explicit pagination limit must be positive",
    explicitPagination.limit > 0,
  );

  TestValidator.predicate(
    "explicit pagination records must be non-negative",
    explicitPagination.records >= 0,
  );

  TestValidator.predicate(
    "explicit pagination pages must be non-negative",
    explicitPagination.pages >= 0,
  );

  TestValidator.predicate(
    "explicit pagination records do not exceed pages * limit",
    explicitPagination.pages === 0
      ? explicitPagination.records === 0
      : explicitPagination.records <=
          explicitPagination.pages * explicitPagination.limit,
  );

  // 3-1. Ensure every eligibility (if any) belongs to authenticated customer
  await ArrayUtil.asyncForEach(
    explicitPage.data,
    async (eligibility, index) => {
      typia.assert<IShoppingMallReviewEligibility.ISummary>(eligibility);
      TestValidator.equals(
        `explicit[${index}].customer.id must match authenticated customer id`,
        eligibility.customer.id,
        customer.id,
      );
    },
  );

  // 4. Unauthenticated call should be rejected (e.g., 401 Unauthorized)
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "unauthenticated access to reviewEligibilities must be rejected with 401",
    401,
    async () => {
      const unauthBody = {
        // minimal request body with no filters, relying on defaults
      } satisfies IShoppingMallReviewEligibility.IRequest;

      await api.functional.shoppingMall.customer.reviewEligibilities.index(
        unauthenticated,
        {
          body: unauthBody,
        },
      );
    },
  );
}
