import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel creation duplicate validation by creating multiple channels with
 * different configurations to verify uniqueness constraint enforcement on
 * channel codes while allowing identical names with different codes. This test
 * validates that the system properly prevents duplicate codes and handles
 * conflict scenarios appropriately.
 *
 * 1. Create the first channel with a unique code and validate it successfully
 * 2. Create a second channel with the same code and verify duplicate error
 * 3. Create a third channel with identical name but different code to confirm
 *    names can be duplicated
 * 4. Test error handling for various duplicate code scenarios
 */
export async function test_api_channel_creation_duplicate_validation(
  connection: api.IConnection,
) {
  // Create first channel with base configuration
  const baseChannelCode = `test_channel_${RandomGenerator.alphabets(5)}`;
  const requestBody1 = {
    code: baseChannelCode,
    name: RandomGenerator.name(),
    description: "First test channel configuration",
    currency_code: "USD",
    language: "en",
    time_zone: "America/New_York",
    commission_rate: 5.0,
  } satisfies IShoppingMallChannel.ICreate;

  const firstChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: requestBody1,
    },
  );
  typia.assert(firstChannel);

  // TestValidator.pass("First channel created successfully");

  // Attempt to create duplicate channel with same code - should fail
  await TestValidator.error("duplicate channel code should fail", async () => {
    const requestBody2 = {
      code: baseChannelCode, // Same code as first channel
      name: RandomGenerator.name(),
      description: "Duplicate channel with same code",
      currency_code: "EUR",
      language: "fr",
      time_zone: "Europe/Paris",
      commission_rate: 7.5,
    } satisfies IShoppingMallChannel.ICreate;

    await api.functional.shoppingMall.channels.create(connection, {
      body: requestBody2,
    });
  });

  // Create third channel with identical name but different code - should succeed
  const thirdChannelCode = `test_channel_${RandomGenerator.alphabets(5)}`;
  const requestBody3 = {
    code: thirdChannelCode,
    name: firstChannel.name, // Same name as first channel
    description: "Third channel with same name but different code",
    currency_code: "GBP",
    language: "en",
    time_zone: "Europe/London",
    commission_rate: 3.0,
  } satisfies IShoppingMallChannel.ICreate;

  const thirdChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: requestBody3,
    },
  );
  typia.assert(thirdChannel);

  // Verify third channel has same name but different code than first channel
  TestValidator.equals(
    "name matches between channels",
    thirdChannel.name,
    firstChannel.name,
  );
  TestValidator.notEquals(
    "codes are different between channels",
    thirdChannel.code,
    firstChannel.code,
  );

  // Test edge case: create channel with only difference in commission rate using same code (should still fail)
  await TestValidator.error(
    "almost identical channel with same code should still fail",
    async () => {
      const requestBody4 = {
        code: baseChannelCode, // Same code as first (still duplicate)
        name: firstChannel.name,
        description: firstChannel.description,
        currency_code: "USD",
        language: "en",
        time_zone: "America/New_York",
        commission_rate: 8.0, // Only difference from first channel
      } satisfies IShoppingMallChannel.ICreate;

      await api.functional.shoppingMall.channels.create(connection, {
        body: requestBody4,
      });
    },
  );
}
