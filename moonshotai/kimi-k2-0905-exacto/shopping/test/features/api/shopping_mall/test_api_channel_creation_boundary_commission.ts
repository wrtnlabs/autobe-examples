import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel creation with commission rates at boundary values including zero
 * percent and maximum allowed rates. This scenario validates proper handling of
 * commission rate constraints including zero commission scenarios and maximum
 * rate enforcement. It ensures that commission rate boundaries are properly
 * enforced and that both edge cases are handled appropriately within business
 * rules.
 *
 * Testing strategy:
 *
 * 1. Test zero commission (0%) - non-profit marketplace scenario
 * 2. Test maximum commission (100%) - theoretical upper bound
 * 3. Test middle-range commission (1-99%) - typical marketplace
 * 4. Verify all commission rates are accepted within boundary constraints
 * 5. Ensure channel creation succeeds with valid boundary values
 *
 * @param connection - API connection object
 */
export async function test_api_channel_creation_boundary_commission(
  connection: api.IConnection,
) {
  // Test Case 1: Zero percent commission - charity marketplace
  const zeroCommissionChannelBody = {
    code: `CHARITY_${RandomGenerator.alphaNumeric(8)}`,
    name: "Charity Marketplace Zero Commission",
    description: "A marketplace for charities with zero percent commission",
    currency_code: "USD",
    language: "en",
    time_zone: "UTC",
    commission_rate: 0 satisfies number & tags.Minimum<0> & tags.Maximum<100>,
  } satisfies IShoppingMallChannel.ICreate;

  const zeroCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: zeroCommissionChannelBody,
    });
  typia.assert(zeroCommissionChannel);

  TestValidator.predicate(
    "zero commission channel has correct commission rate",
    zeroCommissionChannel.commission_rate === 0,
  );

  // Test Case 2: Maximum commission (100%) - theoretical upper bound test
  const maxCommissionChannelBody = {
    code: `PREMIUM_${RandomGenerator.alphaNumeric(8)}`,
    name: "Premium 100% Commission Channel",
    description: "Premium marketplace charging maximum allowed commission",
    currency_code: "EUR",
    language: "de",
    time_zone: "Europe/Berlin",
    commission_rate: 100 satisfies number & tags.Minimum<0> & tags.Maximum<100>,
  } satisfies IShoppingMallChannel.ICreate;

  const maxCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: maxCommissionChannelBody,
    });
  typia.assert(maxCommissionChannel);

  TestValidator.predicate(
    "maximum commission channel has correct commission rate",
    maxCommissionChannel.commission_rate === 100,
  );

  // Test Case 3: Middle-range commission (typical marketplace)
  const typicalCommissionRate = typia.random<
    number & tags.Minimum<1> & tags.Maximum<99>
  >();
  const typicalChannelBody = {
    code: `MARKET_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    currency_code: RandomGenerator.pick(["USD", "EUR", "JPY", "GBP", "KRW"]),
    language: RandomGenerator.pick(["en", "zh", "ja", "ko", "es", "fr", "de"]),
    commission_rate: typicalCommissionRate,
  } satisfies IShoppingMallChannel.ICreate;

  const typicalChannel = await api.functional.shoppingMall.channels.create(
    connection,
    { body: typicalChannelBody },
  );
  typia.assert(typicalChannel);

  TestValidator.predicate(
    "typical commission channel has correct commission rate",
    typicalChannel.commission_rate === typicalCommissionRate,
  );

  // Additional Test Case: Edge value validation - just above zero
  const nearZeroCommissionChannelBody = {
    code: `LOWCOMM_${RandomGenerator.alphaNumeric(8)}`,
    name: "Low Commission Marketplace",
    description: "Budget-friendly marketplace with minimal commission",
    currency_code: RandomGenerator.pick(["USD", "EUR"]),
    language: RandomGenerator.pick(["en", "es"]),
    commission_rate: 0.01 satisfies number &
      tags.Minimum<0> &
      tags.Maximum<100>,
  } satisfies IShoppingMallChannel.ICreate;

  const nearZeroChannel = await api.functional.shoppingMall.channels.create(
    connection,
    { body: nearZeroCommissionChannelBody },
  );
  typia.assert(nearZeroChannel);

  TestValidator.predicate(
    "near-zero commission channel has correct commission rate",
    nearZeroChannel.commission_rate === 0.01,
  );

  // Validation: All created channels should maintain their commission rates
  TestValidator.predicate(
    "zero commission channel commission rate is valid",
    zeroCommissionChannel.commission_rate >= 0 &&
      zeroCommissionChannel.commission_rate <= 100,
  );

  TestValidator.predicate(
    "maximum commission channel commission rate is valid",
    maxCommissionChannel.commission_rate >= 0 &&
      maxCommissionChannel.commission_rate <= 100,
  );

  TestValidator.predicate(
    "typical commission channel commission rate is valid",
    typicalChannel.commission_rate >= 0 &&
      typicalChannel.commission_rate <= 100,
  );

  TestValidator.predicate(
    "near-zero commission channel commission rate is valid",
    nearZeroChannel.commission_rate >= 0 &&
      nearZeroChannel.commission_rate <= 100,
  );
}
