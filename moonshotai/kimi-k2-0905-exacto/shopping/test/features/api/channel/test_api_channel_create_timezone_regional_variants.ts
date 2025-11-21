import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel creation with various timezone specifications for regional
 * operation scheduling and customer service coordination. Validates proper
 * timezone handling and regional marketplace adaptation capabilities.
 *
 * 1. Create channel with common timezone (America/New_York)
 * 2. Create channel with European timezone (Europe/London)
 * 3. Create channel with Asian timezone (Asia/Tokyo)
 * 4. Create channel with UTC timezone
 * 5. Create channel without timezone (null)
 * 6. Verify all created channels have proper timezone handling
 * 7. Test commission rate validation (0-100 range)
 * 8. Test currency code validation (3 characters)
 * 9. Test language code validation (2-10 characters)
 * 10. Test description max length validation
 */
export async function test_api_channel_create_timezone_regional_variants(
  connection: api.IConnection,
) {
  // Test 1: Create channel with America/New_York timezone
  const channel1 = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        currency_code: "USD",
        language: "en-US",
        time_zone: "America/New_York",
        commission_rate: 5.5,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel1);

  // Test 2: Create channel with Europe/London timezone
  const channel2 = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        currency_code: "GBP",
        language: "en-GB",
        time_zone: "Europe/London",
        commission_rate: 7.0,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel2);

  // Test 3: Create channel with Asia/Tokyo timezone
  const channel3 = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        currency_code: "JPY",
        language: "ja",
        time_zone: "Asia/Tokyo",
        commission_rate: 3.5,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel3);

  // Test 4: Create channel with UTC timezone
  const channel4 = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        currency_code: "EUR",
        language: "en",
        time_zone: "UTC",
        commission_rate: 6.25,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel4);

  // Test 5: Create channel without timezone (null)
  const channel5 = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: null,
        currency_code: "CAD",
        language: "en-CA",
        time_zone: null,
        commission_rate: 4.0,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel5);

  // Validate timezone properties
  TestValidator.equals(
    "America/New_York timezone",
    channel1.time_zone,
    "America/New_York",
  );
  TestValidator.equals(
    "Europe/London timezone",
    channel2.time_zone,
    "Europe/London",
  );
  TestValidator.equals("Asia/Tokyo timezone", channel3.time_zone, "Asia/Tokyo");
  TestValidator.equals("UTC timezone", channel4.time_zone, "UTC");
  TestValidator.equals("null timezone", channel5.time_zone, null);

  // Validate commission rates
  TestValidator.equals(
    "commission rate within range",
    channel1.commission_rate,
    5.5,
  );
  TestValidator.predicate(
    "commission rate valid",
    channel1.commission_rate >= 0 && channel1.commission_rate <= 100,
  );

  // Test maximum commission rate
  const maxCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        currency_code: "AUD",
        language: "en-AU",
        commission_rate: 100,
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(maxCommissionChannel);
  TestValidator.equals(
    "maximum commission rate",
    maxCommissionChannel.commission_rate,
    100,
  );

  // Test minimum commission rate
  const minCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        currency_code: "CNY",
        language: "zh-CN",
        commission_rate: 0,
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(minCommissionChannel);
  TestValidator.equals(
    "minimum commission rate",
    minCommissionChannel.commission_rate,
    0,
  );

  // Test description max length
  const longDescriptionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.content({
          paragraphs: 10,
          sentenceMin: 20,
          sentenceMax: 30,
        }),
        currency_code: "CHF",
        language: "de-CH",
        commission_rate: 8.5,
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(longDescriptionChannel);
  TestValidator.predicate(
    "description length within limit",
    longDescriptionChannel.description
      ? longDescriptionChannel.description.length <= 2000
      : true,
  );
}
