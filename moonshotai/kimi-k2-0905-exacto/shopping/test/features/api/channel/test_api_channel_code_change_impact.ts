import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

export async function test_api_channel_code_change_impact(
  connection: api.IConnection,
) {
  // Step 1: Create initial channel with business identifier code
  const initialChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "primary-marketplace",
        name: "Primary Marketplace Channel",
        description: "Main selling environment for general merchandise",
        currency_code: "USD",
        language: "en",
        time_zone: "America/New_York",
        commission_rate: 5.5,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(initialChannel);

  // Step 2: Update channel code to new URL-safe identifier
  const updatedChannel = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: initialChannel.code,
      body: {
        id: initialChannel.id,
        code: "updated-primary-channel",
        name: "Updated Primary Channel",
        description: "Modernized marketplace with enhanced features",
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(updatedChannel);

  // Step 3: Verify updated channel maintains properties
  TestValidator.equals(
    "channel ID unchanged",
    updatedChannel.id,
    initialChannel.id,
  );
  TestValidator.equals(
    "channel code updated",
    updatedChannel.code,
    "updated-primary-channel",
  );
  TestValidator.equals(
    "channel name updated",
    updatedChannel.name,
    "Updated Primary Channel",
  );
  TestValidator.equals(
    "currency preserved",
    updatedChannel.currency_code,
    initialChannel.currency_code,
  );
  TestValidator.equals(
    "language preserved",
    updatedChannel.language,
    initialChannel.language,
  );

  // Step 4: Test with URL-safe character patterns
  const urlSafeChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "channel-123_test.env",
        name: "URL-Safe Test Channel",
        description: "Testing URL-safe characters in code",
        currency_code: "EUR",
        language: "de",
        commission_rate: 7.8,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(urlSafeChannel);

  // Step 5: Update with complex URL-safe pattern
  const complexUpdated = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: urlSafeChannel.code,
      body: {
        id: urlSafeChannel.id,
        code: "premium-channel_2024-v2",
        commission_rate: 8.2,
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(complexUpdated);

  TestValidator.equals(
    "complex code updated",
    complexUpdated.code,
    "premium-channel_2024-v2",
  );
  TestValidator.equals(
    "commission rate updated",
    complexUpdated.commission_rate,
    8.2,
  );

  // Step 6: Validate integration compatibility
  TestValidator.predicate(
    "code length within limits",
    urlSafeChannel.code.length <= 255 && urlSafeChannel.code.length >= 1,
  );
  TestValidator.predicate(
    "updated channel active status correct",
    updatedChannel.is_active === true,
  );

  // Step 7: Verify system consistency across updates
  TestValidator.predicate(
    "timestamps updated correctly",
    updatedChannel.updated_at >= initialChannel.updated_at,
  );
}
