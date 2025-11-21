import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel timezone specification updates including regional timezone
 * selection and time-sensitive operation scheduling. Validates proper regional
 * time handling for customer interactions and administrative operations
 * coordination.
 *
 * Test flow:
 *
 * 1. Create a new channel with initial timezone configuration
 * 2. Update the channel to use different regional timezones
 * 3. Validate timezone changes are properly reflected
 * 4. Test timezone updates for various geographic regions
 * 5. Ensure proper time-sensitive operation scheduling validation
 */
export async function test_api_channel_timezone_modification(
  connection: api.IConnection,
) {
  // Step 1: Create initial channel with timezone configuration
  const timezone = "America/New_York";
  const initialChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: typia.random<string & tags.MinLength<1> & tags.MaxLength<255>>(),
        name: RandomGenerator.name(),
        currency_code: "USD",
        language: "en",
        commission_rate: typia.random<
          number & tags.Minimum<0> & tags.Maximum<100>
        >(),
        time_zone: timezone,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(initialChannel);

  TestValidator.equals(
    "initial channel timezone",
    initialChannel.time_zone,
    timezone,
  );

  // Step 2: Update to European timezone
  const europeTimezone = "Europe/London";
  const updatedChannel = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: initialChannel.code,
      body: {
        id: initialChannel.id,
        time_zone: europeTimezone,
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(updatedChannel);

  TestValidator.equals(
    "updated channel timezone to Europe",
    updatedChannel.time_zone,
    europeTimezone,
  );
  TestValidator.notEquals(
    "timezone field changed",
    initialChannel.time_zone,
    updatedChannel.time_zone,
  );

  // Step 3: Test timezone update to Asia region
  const asiaTimezone = "Asia/Tokyo";
  const asiaChannel = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: initialChannel.code,
      body: {
        id: initialChannel.id,
        time_zone: asiaTimezone,
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(asiaChannel);

  TestValidator.equals(
    "updated channel timezone to Asia",
    asiaChannel.time_zone,
    asiaTimezone,
  );

  // Step 4: Test timezone reset (null value)
  const nullTimezoneChannel = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: initialChannel.code,
      body: {
        id: initialChannel.id,
        time_zone: null,
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(nullTimezoneChannel);

  TestValidator.equals(
    "channel timezone set to null",
    nullTimezoneChannel.time_zone,
    null,
  );

  // Step 5: Test timezone update back to original timezone
  const finalChannel = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: initialChannel.code,
      body: {
        id: initialChannel.id,
        time_zone: timezone,
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(finalChannel);

  TestValidator.equals(
    "channel timezone restored",
    finalChannel.time_zone,
    timezone,
  );
  TestValidator.predicate(
    "channel update timestamp incremented",
    finalChannel.updated_at >= initialChannel.updated_at,
  );
}
