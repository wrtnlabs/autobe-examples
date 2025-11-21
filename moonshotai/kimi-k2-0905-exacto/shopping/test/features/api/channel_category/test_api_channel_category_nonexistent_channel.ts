import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

/**
 * Validate error handling for non-existent channel code in category retrieval.
 *
 * Tests the API's behavior when attempting to retrieve category information
 * using channel codes that don't exist in the system. This is crucial for:
 *
 * 1. Security validation - ensuring system doesn't expose sensitive data
 * 2. Input validation - confirming proper handling of invalid identifiers
 * 3. Error messaging - validating helpful error responses
 * 4. System resilience - testing boundary conditions
 *
 * The test covers scenarios with both completely non-existent channels and
 * channels that exist but contain non-existent categories, ensuring
 * comprehensive error handling coverage.
 */
export async function test_api_channel_category_nonexistent_channel(
  connection: api.IConnection,
) {
  // Step 1: Test with non-existent channel code and random category
  const nonExistentChannelCode = RandomGenerator.alphabets(10);
  const randomCategoryCode = RandomGenerator.alphabets(8);

  // Verify error is thrown for non-existent channel
  await TestValidator.error(
    "non-existent channel should throw error",
    async () => {
      await api.functional.shoppingMall.channels.categories.at(connection, {
        channelCode: nonExistentChannelCode,
        categoryCode: randomCategoryCode,
      });
    },
  );

  // Step 2: Test with different combinations of invalid identifiers
  const differentChannelCode = RandomGenerator.alphabets(12);
  const differentCategoryCode = RandomGenerator.alphabets(6);

  await TestValidator.error(
    "different non-existent channel should also throw error",
    async () => {
      await api.functional.shoppingMall.channels.categories.at(connection, {
        channelCode: differentChannelCode,
        categoryCode: differentCategoryCode,
      });
    },
  );

  // Step 3: Test with numeric-looking channel codes
  const numericChannelCode = RandomGenerator.alphaNumeric(8);
  const numericCategoryCode = RandomGenerator.alphaNumeric(5);

  await TestValidator.error(
    "numeric-style channel code should throw error",
    async () => {
      await api.functional.shoppingMall.channels.categories.at(connection, {
        channelCode: numericChannelCode,
        categoryCode: numericCategoryCode,
      });
    },
  );

  // Step 4: Test with special characters (URL-encoded)
  const specialChannelCode = `spec_${RandomGenerator.alphabets(5)}`;
  const specialCategoryCode = `cat_${RandomGenerator.alphabets(4)}`;

  await TestValidator.error(
    "channel code with special characters should throw error",
    async () => {
      await api.functional.shoppingMall.channels.categories.at(connection, {
        channelCode: specialChannelCode,
        categoryCode: specialCategoryCode,
      });
    },
  );
}
