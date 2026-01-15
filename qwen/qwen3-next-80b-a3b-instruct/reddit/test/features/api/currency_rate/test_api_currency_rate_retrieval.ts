import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleCurrencyRate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleCurrencyRate";
export async function test_api_currency_rate_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random valid ISO 4217 currency code (3 uppercase letters)
  const currencyCode = typia.random<string & tags.Pattern<"^[A-Z]{3}$">>();
  // Call the API to retrieve the currency rate for the generated code
  const currencyRate: ICommunityPlatformSaleCurrencyRate =
    await api.functional.communityPlatform.salescurrencyrates.at(connection, {
      currencyCode,
    });
  // Validate the response using typia.assert for complete type safety
  typia.assert(currencyRate);
  // Verify business logic: fromCurrency matches the requested currency code
  TestValidator.equals(
    "currency code matches request",
    currencyRate.fromCurrency,
    currencyCode,
  );
  // Verify business logic: toCurrency must be different from fromCurrency (enforced by business rule, not type system)
  TestValidator.equals(
    "toCurrency is different from fromCurrency",
    currencyRate.fromCurrency !== currencyRate.toCurrency,
    true,
  );
}