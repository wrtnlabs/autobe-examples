import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel retrieval when the specified channel code does not exist in the
 * system. Validates API error handling for non-existent marketplace channels.
 *
 * 1. Generate random channel code for testing
 * 2. Attempt to retrieve channel that doesn't exist
 * 3. Validate error response structure
 *
 * @param connection API connection for test execution
 */
export async function test_api_marketplace_channel_not_found(
  connection: api.IConnection,
) {
  // Generate random channel code for testing non-existent channel
  const nonExistentChannelCode = RandomGenerator.alphabets(10);

  // Attempt to retrieve non-existent channel and validate error handling
  await TestValidator.error(
    "should return error for non-existent channel code",
    async () => {
      await api.functional.shoppingMall.channels.at(connection, {
        channelCode: nonExistentChannelCode,
      });
    },
  );
}
