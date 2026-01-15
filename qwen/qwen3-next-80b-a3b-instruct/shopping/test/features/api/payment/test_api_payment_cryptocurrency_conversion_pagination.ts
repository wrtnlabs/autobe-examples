import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentCryptocurrencyConversion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentCryptocurrencyConversion";
import type { IShoppingMallPaymentCryptocurrencyConversion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentCryptocurrencyConversion";
export async function test_api_payment_cryptocurrency_conversion_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for authenticated operations
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate realistic test data
  const fromCurrencies = ["USD", "EUR", "KRW", "JPY"] as const;
  const toCurrencies = ["BTC", "ETH", "USDT", "LTC"] as const;
  // Generate conversion records (150 total for pagination testing)
  const conversionRecords: IShoppingMallPaymentCryptocurrencyConversion[] = [];
  // Create 150 conversion records through the API
  for (let i = 0; i < 150; i++) {
    const conversion: IShoppingMallPaymentCryptocurrencyConversion = {
      id: typia.random<string & tags.Format<"uuid">>(),
      from_currency: RandomGenerator.pick(fromCurrencies),
      to_currency: RandomGenerator.pick(toCurrencies),
      conversion_rate: typia.random<number & tags.Minimum<0>>(),
      source_amount: typia.random<number & tags.Minimum<0>>(),
      target_amount: typia.random<number & tags.Minimum<0>>(),
      created_at: new Date().toISOString(),
      source_confidence: typia.random<
        number & tags.Minimum<0> & tags.Maximum<1>
      >(),
      transaction_id: typia.random<string & tags.Format<"uuid">>(),
      fee_amount: typia.random<number & tags.Minimum<0>>(),
      status: RandomGenerator.pick(["completed"] as const), // Use completed status for reliability
      customer_id: typia.random<string & tags.Format<"uuid">>(),
      merchant_id: typia.random<string & tags.Format<"uuid">>(),
    };
    conversionRecords.push(conversion);
  }
  // Since there is no API endpoint to create conversion records directly,
  // we must rely on the system's existing data for pagination testing.
  // The scenario requires testing pagination on conversion records,
  // so we query the system to ensure there are records available.
  // Query for records with default parameters
  const initialResponse: IPageIShoppingMallPaymentCryptocurrencyConversion =
    await api.functional.shoppingMall.payment_cryptocurrency_conversions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallPaymentCryptocurrencyConversion.IRequest,
      },
    );
  typia.assert(initialResponse);
  // Verify we have sufficient records for meaningful pagination testing
  // Since we cannot create records via API, we test against whatever exists in the system
  // For pagination testing, we need at least 20 records to test page=1 and page=2
  TestValidator.predicate(
    "sufficient records exist for pagination test",
    initialResponse.pagination.records >= 20,
  );
  // Test pagination with page=1 and limit=10
  const response1: IPageIShoppingMallPaymentCryptocurrencyConversion =
    await api.functional.shoppingMall.payment_cryptocurrency_conversions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPaymentCryptocurrencyConversion.IRequest,
      },
    );
  typia.assert(response1);
  // Validate first page results
  TestValidator.equals("first page has 10 records", response1.data.length, 10);
  TestValidator.equals(
    "first page current page is 1",
    response1.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit is 10",
    response1.pagination.limit,
    10,
  );
  // Test pagination with page=2 and limit=10
  const response2: IPageIShoppingMallPaymentCryptocurrencyConversion =
    await api.functional.shoppingMall.payment_cryptocurrency_conversions.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallPaymentCryptocurrencyConversion.IRequest,
      },
    );
  typia.assert(response2);
  // Validate second page results
  TestValidator.equals("second page has 10 records", response2.data.length, 10);
  TestValidator.equals(
    "second page current page is 2",
    response2.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit is 10",
    response2.pagination.limit,
    10,
  );
  // Verify no overlap between pages (last of page 1 != first of page 2)
  TestValidator.notEquals(
    "no overlap between page 1 and 2",
    response1.data[9].id,
    response2.data[0].id,
  );
  // Test pagination with limit=100 (maximum allowed)
  const response3: IPageIShoppingMallPaymentCryptocurrencyConversion =
    await api.functional.shoppingMall.payment_cryptocurrency_conversions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallPaymentCryptocurrencyConversion.IRequest,
      },
    );
  typia.assert(response3);
  // Validate maximum limit results
  TestValidator.predicate(
    "maximum limit returns up to 100 records",
    response3.data.length <= 100,
  );
  TestValidator.equals(
    "maximum limit limit is 100",
    response3.pagination.limit,
    100,
  );
  // Test pagination with no limit specified (uses default)
  const response4: IPageIShoppingMallPaymentCryptocurrencyConversion =
    await api.functional.shoppingMall.payment_cryptocurrency_conversions.index(
      adminConnection,
      {
        body: {
          page: 1,
        } satisfies IShoppingMallPaymentCryptocurrencyConversion.IRequest,
      },
    );
  typia.assert(response4);
  // Validate default limit (50)
  TestValidator.equals("default limit is 50", response4.pagination.limit, 50);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination records should reflect total records",
    response1.pagination.records,
    initialResponse.pagination.records,
  );
  TestValidator.equals(
    "pagination pages should be ceiling(records/limit)",
    response1.pagination.pages,
    Math.ceil(initialResponse.pagination.records / 10),
  );
}
