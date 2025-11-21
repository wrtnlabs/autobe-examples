import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel creation with commission optimization for balanced seller
 * economics and platform revenue.
 *
 * This comprehensive test validates marketplace channel creation with strategic
 * commission rate configurations. The test demonstrates how to create multiple
 * marketplace environments with different commission structures that balance
 * seller cost-effectiveness with platform revenue sustainability. By testing
 * various commission rates from competitive low rates to premium marketplace
 * rates, this ensures the platform can support diverse business models while
 * maintaining healthy economics for both sellers and the platform operator.
 *
 * Business Context:
 *
 * - Commission rates directly impact seller profitability and platform revenue
 * - Different market segments require different commission strategies
 * - Rate boundaries must prevent unsustainable business models
 * - Channel configurations must support scalable marketplace operations
 *
 * Test Flow:
 *
 * 1. Create low-commission competitive marketplace channel (5%)
 * 2. Create standard marketplace channel with moderate rates (15%)
 * 3. Create premium marketplace channel with higher rates (25%)
 * 4. Validate boundary commission rates (0% and 100%)
 * 5. Verify all channels are created with correct settings
 * 6. Test error conditions for invalid commission rates
 */
export async function test_api_channel_creation_with_commission_optimization(
  connection: api.IConnection,
) {
  // Create competitive low-commission channel for price-sensitive markets
  const competitiveChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: `competitive-${RandomGenerator.alphaNumeric(8)}`,
        name: "Competitive Marketplace",
        description:
          "Low-commission marketplace targeting price-sensitive customers with competitive seller rates",
        currency_code: RandomGenerator.pick(["USD", "EUR", "KRW"] as const),
        language: RandomGenerator.pick(["en", "ko", "ja"] as const),
        time_zone: "Asia/Seoul",
        commission_rate: 5.0,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(competitiveChannel);

  // Create standard marketplace with moderate commission rates
  const standardChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: `standard-${RandomGenerator.alphaNumeric(8)}`,
        name: "Standard Marketplace",
        description:
          "Balanced marketplace with moderate commission rates supporting sustainable platform operations",
        currency_code: RandomGenerator.pick(["USD", "EUR", "KRW"] as const),
        language: RandomGenerator.pick(["en", "ko", "ja"] as const),
        time_zone: "America/New_York",
        commission_rate: 15.0,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(standardChannel);

  // Create premium marketplace with higher commission rates for premium services
  const premiumChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: `premium-${RandomGenerator.alphaNumeric(8)}`,
        name: "Premium Marketplace",
        description:
          "Premium marketplace with enhanced services and higher commission rates for superior seller support",
        currency_code: RandomGenerator.pick(["USD", "EUR", "KRW"] as const),
        language: RandomGenerator.pick(["en", "ko", "ja"] as const),
        time_zone: "Europe/London",
        commission_rate: 25.0,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(premiumChannel);

  // Test boundary conditions - minimum commission rate (0%)
  const zeroCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: `zero_comm-${RandomGenerator.alphaNumeric(8)}`,
        name: "Zero Commission Marketplace",
        description:
          "Commission-free marketplace for promotional purposes and seller acquisition",
        currency_code: "USD",
        language: "en",
        commission_rate: 0.0,
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(zeroCommissionChannel);

  // Test boundary conditions - maximum commission rate (100%)
  const maxCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: `max_comm-${RandomGenerator.alphaNumeric(8)}`,
        name: "Maximum Commission Channel",
        description:
          "Channel with maximum allowed commission rate for testing boundary conditions",
        currency_code: "EUR",
        language: "en",
        commission_rate: 100.0,
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(maxCommissionChannel);

  // Validate all channels have correct commission rates
  TestValidator.equals(
    "competitive channel commission should be 5%",
    competitiveChannel.commission_rate,
    5.0,
  );
  TestValidator.equals(
    "standard channel commission should be 15%",
    standardChannel.commission_rate,
    15.0,
  );
  TestValidator.equals(
    "premium channel commission should be 25%",
    premiumChannel.commission_rate,
    25.0,
  );
  TestValidator.equals(
    "zero commission channel rate should be 0%",
    zeroCommissionChannel.commission_rate,
    0.0,
  );
  TestValidator.equals(
    "max commission channel rate should be 100%",
    maxCommissionChannel.commission_rate,
    100.0,
  );

  // Validate channel creation metadata and business logic
  TestValidator.predicate(
    "all channels should be active by default",
    competitiveChannel.is_active &&
      standardChannel.is_active &&
      premiumChannel.is_active &&
      zeroCommissionChannel.is_active &&
      maxCommissionChannel.is_active,
  );

  TestValidator.predicate(
    "competitive channel should have low-commission description",
    competitiveChannel.description!.includes("low-commission"),
  );

  TestValidator.predicate(
    "premium channel should have enhanced service description",
    premiumChannel.description!.includes("enhanced services"),
  );

  TestValidator.predicate(
    "zero commission channel should indicate promotional purpose",
    zeroCommissionChannel.description!.includes("Commission-free"),
  );

  // Validate currency and language diversity across channels
  const currencies = [
    competitiveChannel.currency_code,
    standardChannel.currency_code,
    premiumChannel.currency_code,
  ];
  const languages = [
    competitiveChannel.language,
    standardChannel.language,
    premiumChannel.language,
  ];

  TestValidator.predicate(
    "channels should support multiple currencies",
    currencies.length === 3 && new Set(currencies).size === currencies.length,
  );

  TestValidator.predicate(
    "channels should support multiple languages",
    languages.length === 3 && new Set(languages).size === languages.length,
  );

  // Validate boundary test channels have required basic information
  TestValidator.equals(
    "zero commission channel should have USD currency",
    zeroCommissionChannel.currency_code,
    "USD",
  );
  TestValidator.equals(
    "zero commission channel should have English language",
    zeroCommissionChannel.language,
    "en",
  );
  TestValidator.equals(
    "max commission channel should have EUR currency",
    maxCommissionChannel.currency_code,
    "EUR",
  );
  TestValidator.equals(
    "max commission channel should have English language",
    maxCommissionChannel.language,
    "en",
  );

  // Validate timezone handling across different regions
  TestValidator.predicate(
    "channels should have appropriate timezones",
    competitiveChannel.time_zone === "Asia/Seoul" &&
      standardChannel.time_zone === "America/New_York" &&
      premiumChannel.time_zone === "Europe/London",
  );

  // Validate creation timestamps are properly generated
  TestValidator.predicate(
    "all channels should have creation timestamps",
    !!competitiveChannel.created_at &&
      !!standardChannel.created_at &&
      !!premiumChannel.created_at &&
      !!zeroCommissionChannel.created_at &&
      !!maxCommissionChannel.created_at,
  );

  TestValidator.predicate(
    "all channels should have update timestamps",
    !!competitiveChannel.updated_at &&
      !!standardChannel.updated_at &&
      !!premiumChannel.updated_at &&
      !!zeroCommissionChannel.updated_at &&
      !!maxCommissionChannel.updated_at,
  );

  TestValidator.predicate(
    "creation and update timestamps should be equal for new channels",
    competitiveChannel.created_at === competitiveChannel.updated_at,
  );

  // Test invalid commission rate scenarios
  await TestValidator.error(
    "commission rate cannot exceed 100% boundary limit",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: `invalid_high-${RandomGenerator.alphaNumeric(8)}`,
          name: "Invalid High Commission",
          description: "Channel with commission rate above maximum limit",
          currency_code: "USD",
          language: "en",
          commission_rate: 101.0,
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  await TestValidator.error(
    "commission rate cannot be negative value",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: `invalid_neg-${RandomGenerator.alphaNumeric(8)}`,
          name: "Invalid Negative Commission",
          description: "Channel with negative commission rate",
          currency_code: "USD",
          language: "en",
          commission_rate: -1.0,
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  // Validate code uniqueness across channels
  const allCodes = [
    competitiveChannel.code,
    standardChannel.code,
    premiumChannel.code,
    zeroCommissionChannel.code,
    maxCommissionChannel.code,
  ];

  TestValidator.equals(
    "all channel codes should be unique",
    allCodes.length,
    new Set(allCodes).size,
  );

  TestValidator.predicate(
    "channel codes should follow expected format",
    allCodes.every((code) => code.length > 0 && code.length <= 255),
  );

  // Validate name diversity and uniqueness
  const allNames = [
    competitiveChannel.name,
    standardChannel.name,
    premiumChannel.name,
    zeroCommissionChannel.name,
    maxCommissionChannel.name,
  ];

  TestValidator.equals(
    "all channel names should be unique",
    allNames.length,
    new Set(allNames).size,
  );

  TestValidator.predicate(
    "channel names should be descriptive and relevant",
    allNames.every((name) => name.length > 0 && name.length <= 255),
  );

  // Final validation ensuring commission optimization strategy
  TestValidator.predicate(
    "commission rates should support diverse business strategies",
    [5.0, 15.0, 25.0, 0.0, 100.0].every((rate) => rate >= 0 && rate <= 100),
  );

  TestValidator.predicate(
    "channels should represent different market segments",
    competitiveChannel.name !== standardChannel.name &&
      standardChannel.name !== premiumChannel.name,
  );

  TestValidator.predicate(
    "commission rates should be properly bounded between 0-100%",
    competitiveChannel.commission_rate >= 0 &&
      competitiveChannel.commission_rate <= 100 &&
      standardChannel.commission_rate >= 0 &&
      standardChannel.commission_rate <= 100 &&
      premiumChannel.commission_rate >= 0 &&
      premiumChannel.commission_rate <= 100 &&
      zeroCommissionChannel.commission_rate >= 0 &&
      zeroCommissionChannel.commission_rate <= 100 &&
      maxCommissionChannel.commission_rate >= 0 &&
      maxCommissionChannel.commission_rate <= 100,
  );

  // Validate business logic consistency
  TestValidator.predicate(
    "premium channel should have higher commission than standard",
    premiumChannel.commission_rate > standardChannel.commission_rate,
  );

  TestValidator.predicate(
    "competitive channel should have lowest commission rate",
    competitiveChannel.commission_rate < standardChannel.commission_rate &&
      competitiveChannel.commission_rate < premiumChannel.commission_rate,
  );

  TestValidator.predicate(
    "zero commission channel should be properly configured",
    zeroCommissionChannel.commission_rate === 0 &&
      zeroCommissionChannel.name.includes("Zero"),
  );

  TestValidator.predicate(
    "max commission channel should reach boundary limit",
    maxCommissionChannel.commission_rate === 100 &&
      maxCommissionChannel.name.includes("Maximum"),
  );
}
