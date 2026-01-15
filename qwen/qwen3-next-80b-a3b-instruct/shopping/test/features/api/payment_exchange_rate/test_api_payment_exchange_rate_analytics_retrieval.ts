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
export async function test_api_payment_exchange_rate_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Call the analytics endpoint to retrieve payment exchange rate data
  const result: IPageIShoppingMallPaymentExchangeRate =
    await api.functional.shoppingMall.analytics.payment_exchange_rates.index(
      connection,
    );
  // Complete type validation using typia.assert() - this validates ALL structure, types, formats, and constraints
  typia.assert(result);
  // Verify result is the expected type
  TestValidator.equals(
    "response type",
    result,
    typia.random<IPageIShoppingMallPaymentExchangeRate>(),
  );
}
