import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel creation with commission rates at boundary values to validate
 * business rule enforcement. Tests minimum (0%), maximum (100%), and various
 * intermediate commission rate configurations. Validates that commission rates
 * properly support platform revenue models while maintaining seller economics
 * viability across different marketplace segments.
 */
export async function test_api_channel_creation_commission_boundaries(
  connection: api.IConnection,
) {
  // Test minimum commission rate (0%)
  const minCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: "min-commission-channel",
        name: "Zero Commission Channel",
        currency_code: "USD",
        language: "en",
        commission_rate: 0, // Minimum boundary
        description:
          "Channel with zero commission for testing minimum boundary",
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(minCommissionChannel);
  TestValidator.equals(
    "minimum commission rate",
    minCommissionChannel.commission_rate,
    0,
  );

  // Test maximum commission rate (100%)
  const maxCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: "max-commission-channel",
        name: "Full Commission Channel",
        currency_code: "USD",
        language: "en",
        commission_rate: 100, // Maximum boundary
        description:
          "Channel with maximum commission for testing upper boundary",
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(maxCommissionChannel);
  TestValidator.equals(
    "maximum commission rate",
    maxCommissionChannel.commission_rate,
    100,
  );

  // Test intermediate commission rates
  const standardChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "standard-commission-channel",
        name: "Standard Commission Channel",
        currency_code: "EUR",
        language: "de",
        commission_rate: 15.5, // Standard marketplace rate
        time_zone: "Europe/Berlin",
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(standardChannel);
  TestValidator.predicate(
    "intermediate commission rate validation",
    standardChannel.commission_rate >= 0 &&
      standardChannel.commission_rate <= 100,
  );

  // Test high commission rate scenario
  const premiumChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "premium-commission-channel",
        name: "Premium Service Channel",
        currency_code: "GBP",
        language: "en",
        commission_rate: 75, // High commission for premium services
        time_zone: "Europe/London",
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(premiumChannel);
  TestValidator.equals(
    "high commission rate",
    premiumChannel.commission_rate,
    75,
  );

  // Test fractional commission rates
  const fractionalChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "fractional-commission-channel",
        name: "Precise Commission Channel",
        currency_code: "CAD",
        language: "fr",
        commission_rate: 8.25, // Fractional rate
        time_zone: "America/Toronto",
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(fractionalChannel);
  TestValidator.equals(
    "fractional commission rate",
    fractionalChannel.commission_rate,
    8.25,
  );

  // Validate all created channels have valid commission rates within boundaries
  TestValidator.predicate(
    "minimum commission boundary check",
    minCommissionChannel.commission_rate >= 0,
  );
  TestValidator.predicate(
    "maximum commission boundary check",
    maxCommissionChannel.commission_rate <= 100,
  );

  // Validate channel properties for business consistency
  TestValidator.predicate(
    "commission rate affects seller economics",
    minCommissionChannel.commission_rate < standardChannel.commission_rate &&
      standardChannel.commission_rate < maxCommissionChannel.commission_rate,
  );

  // Test with random commission rates within boundaries
  const randomCommission = typia.random<
    number & tags.Minimum<0> & tags.Maximum<100>
  >();
  const randomChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: `random-channel-${typia.random<string & tags.MinLength<5> & tags.MaxLength<10>>()}`,
        name: `Random Commission ${randomCommission}% Channel`,
        currency_code: RandomGenerator.pick([
          "USD",
          "EUR",
          "GBP",
          "JPY",
          "CNY",
        ] as const),
        language: RandomGenerator.pick(["en", "de", "fr", "es", "zh"] as const),
        commission_rate: randomCommission,
        description: `Channel with random commission rate of ${randomCommission}%`,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(randomChannel);
  TestValidator.predicate(
    "random commission rate validation",
    randomChannel.commission_rate >= 0 && randomChannel.commission_rate <= 100,
  );
}
