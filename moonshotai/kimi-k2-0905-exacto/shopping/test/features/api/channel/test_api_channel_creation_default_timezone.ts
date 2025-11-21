import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel creation with null timezone configuration.
 *
 * This test validates that marketplace channels can be successfully created
 * without explicitly specifying a timezone, testing the optional parameter
 * handling and ensuring system defaults are applied properly. The test follows
 * a complete channel creation workflow: 1) Create a channel with null timezone,
 * 2) Create a channel with undefined timezone, 3) Create a channel with
 * specified timezone for comparison, 4) Validate all channels were created
 * successfully with proper time_zone values.
 */
export async function test_api_channel_creation_default_timezone(
  connection: api.IConnection,
) {
  // Step 1: Create channel with null timezone
  const nullTimezoneChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "test-channel-null",
        name: "Test Channel with Null Timezone",
        description: "Channel created with explicit null timezone",
        currency_code: "USD",
        language: "en",
        time_zone: null,
        commission_rate: 5.0,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(nullTimezoneChannel);

  // Step 2: Create channel with undefined timezone (property omitted)
  const undefinedTimezoneChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: "test-channel-undefined",
        name: "Test Channel with Undefined Timezone",
        description: "Channel created without timezone property",
        currency_code: "EUR",
        language: "de",
        commission_rate: 7.5,
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(undefinedTimezoneChannel);

  // Step 3: Create channel with specified timezone for comparison
  const specifiedTimezoneChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: "test-channel-specified",
        name: "Test Channel with Specified Timezone",
        description: "Channel created with explicit timezone",
        currency_code: "KRW",
        language: "ko",
        time_zone: "Asia/Seoul",
        commission_rate: 3.0,
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(specifiedTimezoneChannel);

  // Step 4: Validate all channels were created successfully
  TestValidator.predicate(
    "null timezone channel created successfully",
    nullTimezoneChannel.id !== null,
  );
  TestValidator.equals(
    "null timezone channel has correct time_zone",
    nullTimezoneChannel.time_zone,
    null,
  );

  TestValidator.predicate(
    "undefined timezone channel created successfully",
    undefinedTimezoneChannel.id !== null,
  );
  TestValidator.equals(
    "undefined timezone channel has correct time_zone",
    undefinedTimezoneChannel.time_zone,
    undefined,
  );

  TestValidator.predicate(
    "specified timezone channel created successfully",
    specifiedTimezoneChannel.id !== null,
  );
  TestValidator.equals(
    "specified timezone channel has correct time_zone",
    specifiedTimezoneChannel.time_zone,
    "Asia/Seoul",
  );

  // Step 5: Validate other properties remain consistent
  TestValidator.equals(
    "null timezone channel name",
    nullTimezoneChannel.name,
    "Test Channel with Null Timezone",
  );
  TestValidator.equals(
    "undefined timezone channel name",
    undefinedTimezoneChannel.name,
    "Test Channel with Undefined Timezone",
  );
  TestValidator.equals(
    "specified timezone channel name",
    specifiedTimezoneChannel.name,
    "Test Channel with Specified Timezone",
  );

  TestValidator.equals(
    "null timezone channel currency",
    nullTimezoneChannel.currency_code,
    "USD",
  );
  TestValidator.equals(
    "undefined timezone channel currency",
    undefinedTimezoneChannel.currency_code,
    "EUR",
  );
  TestValidator.equals(
    "specified timezone channel currency",
    specifiedTimezoneChannel.currency_code,
    "KRW",
  );
}
