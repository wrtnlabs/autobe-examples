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
export async function test_api_payment_exchange_rate_sort_by_rate_value(
  connection: api.IConnection,
): Promise<void> {
  // Define test currency pair and date range
  const currencyFrom = "USD";
  const currencyTo = "EUR";
  // Use today and yesterday to ensure we get historical data
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  // Create valid request following IShoppingMallPaymentExchangeRate.IRequest schema
  const request: IShoppingMallPaymentExchangeRate.IRequest = {
    currency_from: currencyFrom,
    currency_to: currencyTo,
    effective_date_gte: yesterday,
    effective_date_lte: today,
    sort_by: "rate_value",
  };
  // Create connection for authenticated user - no utility functions so we assume system allows unauthenticated reads
  // The API might allow public read access to exchange rates
  const publicConnection: api.IConnection = { host: connection.host };
  // Fetch the sorted exchange rates
  const result: IPageIShoppingMallPaymentExchangeRate.ISummary =
    await api.functional.shoppingMall.payment_exchange_rates.index(
      publicConnection,
      {
        body: request,
      },
    );
  // Verify the response structure and types with typia.assert
  typia.assert(result);
  // Validate we received at least one result
  TestValidator.predicate(
    "at least one exchange rate returned",
    result.data.length > 0,
  );
  // Extract all exchange rates from response
  const exchangeRates = result.data.map((rate) => rate.exchange_rate);
  // Verify the results are sorted in ascending order by exchange_rate
  for (let i = 0; i < exchangeRates.length - 1; i++) {
    TestValidator.predicate(
      `exchange rate ${i} ${exchangeRates[i]} <= rate ${i + 1} ${exchangeRates[i + 1]}`,
      exchangeRates[i] <= exchangeRates[i + 1],
    );
  }
  // Validate pagination info is correct (at least basic validation)
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination current page is at least 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records is at least equal to data length",
    result.pagination.records >= result.data.length,
  );
}
