import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel retrieval with invalid channel code format or special
 * characters. Validates proper input validation and sanitization of the channel
 * code parameter. Ensures the API handles malformed inputs appropriately and
 * returns suitable error responses.
 */
export async function test_api_marketplace_channel_invalid_channel_code(
  connection: api.IConnection,
) {
  // Test 1: Empty channel code
  await TestValidator.error(
    "empty channel code should be rejected",
    async () => {
      await api.functional.shoppingMall.channels.at(connection, {
        channelCode: "",
      });
    },
  );

  // Test 2: Channel code with special characters
  const specialCharacterCodes = [
    "@" + RandomGenerator.alphabets(5),
    "#" + RandomGenerator.alphabets(5),
    "$" + RandomGenerator.alphabets(5),
    "%" + RandomGenerator.alphabets(5),
  ];

  await ArrayUtil.asyncForEach(specialCharacterCodes, async (charCode) => {
    await TestValidator.error(
      `channel code with special character should be rejected: ${charCode}`,
      async () => {
        await api.functional.shoppingMall.channels.at(connection, {
          channelCode: charCode,
        });
      },
    );
  });

  // Test 3: Channel code with whitespace
  const whitespaceCodes = [
    RandomGenerator.alphabets(3) + " " + RandomGenerator.alphabets(3),
    " " + RandomGenerator.alphabets(5),
    RandomGenerator.alphabets(5) + " ",
  ];

  await ArrayUtil.asyncForEach(whitespaceCodes, async (whitespaceCode) => {
    await TestValidator.error(
      `channel code with whitespace should be rejected: ${whitespaceCode}`,
      async () => {
        await api.functional.shoppingMall.channels.at(connection, {
          channelCode: whitespaceCode,
        });
      },
    );
  });

  // Test 4: Channel code exceeding max length (100 characters)
  await TestValidator.error(
    "channel code exceeding max length should be rejected",
    async () => {
      await api.functional.shoppingMall.channels.at(connection, {
        channelCode: RandomGenerator.alphabets(120),
      });
    },
  );

  // Test 5: Channel code with reserved symbols which should be URL-safe
  await TestValidator.error(
    "channel code with reserved symbols should be rejected",
    async () => {
      await api.functional.shoppingMall.channels.at(connection, {
        channelCode:
          RandomGenerator.alphabets(3) + "&+" + RandomGenerator.alphabets(3),
      });
    },
  );

  // Test 6: Unicode characters (non-ASCII)
  await TestValidator.error(
    "channel code with unicode characters should be rejected",
    async () => {
      await api.functional.shoppingMall.channels.at(connection, {
        channelCode: "测试" + RandomGenerator.alphabets(3),
      });
    },
  );

  // Test 7: Mixed invalid patterns
  await TestValidator.error(
    "channel code with mixed invalid patterns should be rejected",
    async () => {
      await api.functional.shoppingMall.channels.at(connection, {
        channelCode:
          RandomGenerator.alphabets(3) + "@#" + RandomGenerator.alphabets(3),
      });
    },
  );

  // Test 8: Null-like values (spaces only)
  await TestValidator.error(
    "channel code with only whitespace should be rejected",
    async () => {
      await api.functional.shoppingMall.channels.at(connection, {
        channelCode: "   ",
      });
    },
  );
}
