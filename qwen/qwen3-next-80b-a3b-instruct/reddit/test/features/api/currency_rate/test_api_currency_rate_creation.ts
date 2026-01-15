import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleCurrencyRate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleCurrencyRate";
import { prepare_random_community_platform_sale_currency_rate } from "../../../prepare/prepare_random_community_platform_sale_currency_rate";
import { generate_random_community_platform_salescurrencyrates_create } from "../../../generate/generate_random_community_platform_salescurrencyrates_create";
export async function test_api_currency_rate_creation(
  connection: api.IConnection,
): Promise<void> {
  // Generate random but valid currency rate data
  const fromCurrency = "USD" as const;
  const toCurrency = "EUR" as const;
  const rate = typia.random<number & tags.MultipleOf<1e-8>>();
  const effectiveFrom = new Date().toISOString();
  // Use the generation function to create the currency rate
  // This function handles internal authentication per documentation
  const createdRate =
    await generate_random_community_platform_salescurrencyrates_create(
      connection, // Use base connection - generation function handles auth internally
      {
        body: {
          fromCurrency,
          toCurrency,
          rate,
          effectiveFrom,
        },
      },
    );
  // Validate the response
  typia.assert<ICommunityPlatformSaleCurrencyRate>(createdRate);
  // Verify all properties
  TestValidator.equals(
    "fromCurrency matches",
    createdRate.fromCurrency,
    fromCurrency,
  );
  TestValidator.equals(
    "toCurrency matches",
    createdRate.toCurrency,
    toCurrency,
  );
  TestValidator.equals("rate matches", createdRate.rate, rate);
  TestValidator.equals(
    "effectiveFrom matches",
    createdRate.effectiveFrom,
    effectiveFrom,
  );
  TestValidator.predicate("rate is positive", createdRate.rate > 0);
}
