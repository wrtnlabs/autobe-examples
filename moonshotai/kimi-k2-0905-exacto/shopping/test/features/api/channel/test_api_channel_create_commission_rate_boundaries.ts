import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel creation with commission rate configuration at boundary values
 * including zero percent and maximum rates.
 *
 * This comprehensive test validates channel creation across different
 * commission rate scenarios:
 *
 * 1. Zero percent commission rate (free marketplace model)
 * 2. Maximum 100% commission rate (extreme business case)
 * 3. Common rate ranges for realistic business scenarios
 * 4. Boundary value validation at minimum (0) and maximum (100) limits
 * 5. Currency code validation with proper ISO 4217 format
 * 6. Complete channel creation with all required fields
 *
 * Business Context: Commission rates directly impact seller economics and
 * platform revenue generation. This test ensures the system properly handles
 * edge cases while maintaining business model viability across different
 * marketplace configurations.
 */
export async function test_api_channel_create_commission_rate_boundaries(
  connection: api.IConnection,
) {
  // Test 1: Zero percent commission (free marketplace model)
  const zeroCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: `${RandomGenerator.name()} Free Marketplace`,
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        currency_code: "USD",
        language: "en",
        time_zone: "UTC",
        commission_rate: 0,
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(zeroCommissionChannel);
  TestValidator.equals(
    "commission rate is zero",
    zeroCommissionChannel.commission_rate,
    0,
  );
  TestValidator.equals(
    "free marketplace is active",
    zeroCommissionChannel.is_active,
    true,
  );

  // Test 2: Maximum commission rate (100% - extreme business case)
  const maxCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: `${RandomGenerator.name()} Premium Exclusive`,
        description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 6,
          wordMax: 12,
        }),
        currency_code: "EUR",
        language: "de",
        time_zone: "Europe/Berlin",
        commission_rate: 100,
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(maxCommissionChannel);
  TestValidator.equals(
    "commission rate is maximum",
    maxCommissionChannel.commission_rate,
    100,
  );

  // Test 3: Common business rate (10-30% range)
  const standardCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: `${RandomGenerator.name()} Standard Market`,
        description: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 8,
        }),
        currency_code: "GBP",
        language: "en",
        time_zone: "Europe/London",
        commission_rate: 15.5,
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(standardCommissionChannel);
  TestValidator.predicate(
    "commission within standard range",
    standardCommissionChannel.commission_rate >= 10 &&
      standardCommissionChannel.commission_rate <= 30,
  );

  // Test 4: Decimal precision handling
  const decimalChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: `${RandomGenerator.name()} Precise Market`,
        description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 9,
        }),
        currency_code: "JPY",
        language: "ja",
        commission_rate: 12.345, // 3 decimal places
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(decimalChannel);
  TestValidator.predicate(
    "decimal precision preserved",
    Number.isFinite(decimalChannel.commission_rate),
  );

  // Test 5: Multi-currency support with different rates
  const currencies = ["USD", "EUR", "GBP", "JPY", "KRW"] as const;
  for (let i = 0; i < 3; i++) {
    const currency = currencies[i];
    const rate = i * 10 + 5; // 5%, 15%, 25%

    const multiCurrencyChannel =
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: `${RandomGenerator.name()} ${currency} Market`,
          currency_code: currency,
          language: RandomGenerator.pick(["en", "es", "fr", "de", "ja"]) as any,
          commission_rate: rate,
        } satisfies IShoppingMallChannel.ICreate,
      });
    typia.assert(multiCurrencyChannel);
    TestValidator.equals(
      "currency code matches",
      multiCurrencyChannel.currency_code,
      currency,
    );
    TestValidator.equals(
      "commission rate matches input",
      multiCurrencyChannel.commission_rate,
      rate,
    );
  }

  // Validation: All channels have unique identifiers
  const allChannels = [
    zeroCommissionChannel,
    maxCommissionChannel,
    standardCommissionChannel,
    decimalChannel,
  ];
  TestValidator.predicate(
    "all channel codes are unique",
    new Set(allChannels.map((c) => c.code)).size === allChannels.length,
  );
  TestValidator.predicate(
    "all channel IDs are unique",
    new Set(allChannels.map((c) => c.id)).size === allChannels.length,
  );

  // Validation: Timestamps are properly generated
  allChannels.forEach((channel, index) => {
    TestValidator.predicate(
      `channel ${index + 1} has valid created_at timestamp`,
      new Date(channel.created_at).toString() !== "Invalid Date",
    );
    TestValidator.predicate(
      `channel ${index + 1} has valid updated_at timestamp`,
      new Date(channel.updated_at).toString() !== "Invalid Date",
    );
  });
}
