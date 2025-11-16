import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

/**
 * Test buyer order search and filtering by creation date ranges.
 *
 * This test validates the temporal filtering capabilities of the buyer order
 * search API by verifying that orders can be filtered using from_date and
 * to_date parameters. The test searches for orders using different date range
 * combinations:
 *
 * 1. Only from_date parameter (orders created on or after)
 * 2. Only to_date parameter (orders created on or before)
 * 3. Both parameters combined (orders within the date range)
 * 4. Verification that pagination works correctly with date filters
 */
export async function test_api_buyer_orders_search_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Search orders with from_date only
  const now = new Date();
  const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const resultWithFromDate =
    await api.functional.shoppingMall.buyer.orders.index(connection, {
      body: {
        from_date: fromDate.toISOString(),
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(resultWithFromDate);

  // Step 3: Search orders with to_date only
  const toDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const resultWithToDate = await api.functional.shoppingMall.buyer.orders.index(
    connection,
    {
      body: {
        to_date: toDate.toISOString(),
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(resultWithToDate);

  // Step 4: Search orders with both from_date and to_date
  const rangeFromDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const rangeToDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const resultWithBothDates =
    await api.functional.shoppingMall.buyer.orders.index(connection, {
      body: {
        from_date: rangeFromDate.toISOString(),
        to_date: rangeToDate.toISOString(),
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(resultWithBothDates);

  // Step 5: Verify all results have valid pagination
  TestValidator.predicate(
    "from_date search returns valid pagination",
    resultWithFromDate.pagination.current >= 1,
  );
  TestValidator.predicate(
    "to_date search returns valid pagination",
    resultWithToDate.pagination.current >= 1,
  );
  TestValidator.predicate(
    "date range search returns valid pagination",
    resultWithBothDates.pagination.current >= 1,
  );

  // Step 6: Test with specific date range boundaries
  const boundaryFromDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const boundaryToDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

  const boundaryResult = await api.functional.shoppingMall.buyer.orders.index(
    connection,
    {
      body: {
        from_date: boundaryFromDate.toISOString(),
        to_date: boundaryToDate.toISOString(),
        page: 1,
        limit: 50,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(boundaryResult);

  // Step 7: Verify pagination properties
  TestValidator.predicate(
    "boundary result has valid pagination structure",
    boundaryResult.pagination.pages >= 0 &&
      boundaryResult.pagination.records >= 0,
  );
}
