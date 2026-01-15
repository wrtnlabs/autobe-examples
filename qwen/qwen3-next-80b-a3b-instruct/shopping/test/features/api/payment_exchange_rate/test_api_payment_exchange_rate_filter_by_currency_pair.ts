import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentExchangeRate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentExchangeRate";
import type { IShoppingMallPaymentExchangeRate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentExchangeRate";
export async function test_api_payment_exchange_rate_filter_by_currency_pair(
  connection: api.IConnection,
): Promise<void> {
  // This test queries for existing exchange rates with USD to EUR currency pair
  // We assume that the system already has exchange rate data seeded with multiple currency pairs
  // and varying effective dates.
  // Query for USD to EUR exchange rates between Dec 1-31, 2023, sorted by effective_date
  const result = await api.functional.shoppingMall.payment_exchange_rates.index(
    connection,
    {
      body: {
        currency_from: "USD",
        currency_to: "EUR",
        effective_date_gte: "2023-12-01",
        effective_date_lte: "2023-12-31",
        sort_by: "effective_date",
      },
    },
  );
  // Validate response type
  typia.assert(result);
  // Verify all results are USD to EUR rates
  TestValidator.predicate(
    "all results are USD to EUR rates",
    result.data.every(
      (rate) =>
        rate.source_currency === "USD" && rate.target_currency === "EUR",
    ),
  );
  // Verify results are sorted by effective_date in ascending order
  // Compare original result with a sorted version
  const sortedByDate = [...result.data].sort(
    (a, b) =>
      new Date(a.effective_date).getTime() -
      new Date(b.effective_date).getTime(),
  );
  // Ensure each record is in chronological order
  TestValidator.equals(
    "results are sorted by effective date in ascending order",
    result.data,
    sortedByDate,
  );
  // Verify pagination metadata is correct
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
  // Verify pagination limit is the default
  TestValidator.equals(
    "pagination limit is default",
    result.pagination.limit,
    10, // Default limit for this endpoint
  );
  // Verify records count is at least 1 (since we're testing a real scenario)
  TestValidator.predicate(
    "at least one USD-EUR exchange rate exists in the date range",
    result.pagination.records > 0,
  );
  // Verify pages count is correctly calculated
  TestValidator.equals(
    "pagination pages count correctly calculated",
    result.pagination.pages,
    Math.ceil(result.pagination.records / result.pagination.limit),
  );
}
