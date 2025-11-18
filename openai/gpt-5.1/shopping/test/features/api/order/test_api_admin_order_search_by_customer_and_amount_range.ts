import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSearch";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallOrderSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSearch";

/**
 * Validate admin order search by customer and amount range.
 *
 * Business goal: Ensure that an authenticated admin can successfully invoke the
 * administrative order search endpoint with a combination of amount-range, time
 * window, and pagination filters, and that the response structure and key
 * business invariants (e.g., amount range, pagination echo) behave consistently
 * with the request.
 *
 * Due to missing customer identity in the ISummary DTO, this test focuses on
 * the parts of the original scenario that are observable via available types:
 * amount range and pagination behavior.
 *
 * High-level steps:
 *
 * 1. Register an admin via /auth/admin/join to obtain an authenticated admin
 *    session.
 * 2. Build a realistic IShoppingMallOrderSearch.IRequest payload with:
 *
 *    - A single customer_ids entry (random UUID),
 *    - Coherent created_from / created_to timestamps,
 *    - Min_grand_total_amount and max_grand_total_amount,
 *    - Page and limit,
 *    - Optional sort_key and sort_direction.
 * 3. Call PATCH /shoppingMall/admin/search/orders.
 * 4. Assert response type IPageIShoppingMallOrderSearch.ISummary using
 *    typia.assert.
 * 5. If data is non-empty, assert for each order that grand_total_amount lies
 *    within the requested [min, max] inclusive range and that
 *    pagination.current and pagination.limit reflect the requested page and
 *    limit.
 * 6. Perform a second, stricter search call with a narrowed amount range (e.g.,
 *    higher min or lower max) and assert that any returned orders still respect
 *    both the original and the tighter amount range and that, when both result
 *    sets are non-empty, the second result set size is less than or equal to
 *    the first.
 */
export async function test_api_admin_order_search_by_customer_and_amount_range(
  connection: api.IConnection,
) {
  // 1. Admin registration to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Build base search request with customer_ids and amount range
  const customerId = typia.random<string & tags.Format<"uuid">>();

  const minAmount = 100;
  const maxAmount = 1_000;

  const now = new Date();
  const createdFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const createdTo = now;

  const page = 1 as number & tags.Type<"int32">;
  const limit = 50 as number & tags.Type<"int32">;

  const baseSearchRequest = {
    customer_ids: [customerId],
    created_from: createdFrom.toISOString(),
    created_to: createdTo.toISOString(),
    min_grand_total_amount: minAmount,
    max_grand_total_amount: maxAmount,
    page,
    limit,
    sort_key: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingMallOrderSearch.IRequest;

  // 3. Execute first search
  const firstPage: IPageIShoppingMallOrderSearch.ISummary =
    await api.functional.shoppingMall.admin.search.orders.index(connection, {
      body: baseSearchRequest,
    });
  typia.assert(firstPage);

  // 4. Validate pagination echo and amount range constraints if data exists
  TestValidator.equals(
    "pagination current equals requested page",
    page,
    firstPage.pagination.current,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    limit,
    firstPage.pagination.limit,
  );

  for (const summary of firstPage.data) {
    TestValidator.predicate(
      "grand_total_amount is not less than min_grand_total_amount",
      summary.grand_total_amount >= minAmount,
    );
    TestValidator.predicate(
      "grand_total_amount is not greater than max_grand_total_amount",
      summary.grand_total_amount <= maxAmount,
    );
  }

  // 5. Build a stricter range and perform a second search
  const stricterMinAmount = minAmount + 50;
  const stricterMaxAmount = maxAmount - 50;

  const stricterSearchRequest = {
    customer_ids: [customerId],
    created_from: createdFrom.toISOString(),
    created_to: createdTo.toISOString(),
    min_grand_total_amount: stricterMinAmount,
    max_grand_total_amount: stricterMaxAmount,
    page,
    limit,
    sort_key: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingMallOrderSearch.IRequest;

  const secondPage: IPageIShoppingMallOrderSearch.ISummary =
    await api.functional.shoppingMall.admin.search.orders.index(connection, {
      body: stricterSearchRequest,
    });
  typia.assert(secondPage);

  TestValidator.equals(
    "second pagination current equals requested page",
    page,
    secondPage.pagination.current,
  );
  TestValidator.equals(
    "second pagination limit equals requested limit",
    limit,
    secondPage.pagination.limit,
  );

  for (const summary of secondPage.data) {
    TestValidator.predicate(
      "stricter: grand_total_amount is not less than stricter min",
      summary.grand_total_amount >= stricterMinAmount,
    );
    TestValidator.predicate(
      "stricter: grand_total_amount is not greater than stricter max",
      summary.grand_total_amount <= stricterMaxAmount,
    );
    TestValidator.predicate(
      "stricter: grand_total_amount still within original min",
      summary.grand_total_amount >= minAmount,
    );
    TestValidator.predicate(
      "stricter: grand_total_amount still within original max",
      summary.grand_total_amount <= maxAmount,
    );
  }

  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.predicate(
      "second result set size is less than or equal to first",
      secondPage.data.length <= firstPage.data.length,
    );
  }
}
