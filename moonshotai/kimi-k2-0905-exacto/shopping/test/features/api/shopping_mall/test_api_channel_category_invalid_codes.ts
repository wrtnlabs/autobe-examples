import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

export async function test_api_channel_category_invalid_codes(
  connection: api.IConnection,
) {
  // First create a valid channel for testing invalid category codes
  const validChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "test-channel-" + RandomGenerator.alphaNumeric(5),
        name: RandomGenerator.name(),
        currency_code: "USD",
        language: "en",
        commission_rate: 10.5,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(validChannel);

  // Test 1: Empty channel code
  await TestValidator.error("should reject empty channel code", async () => {
    await api.functional.shoppingMall.channels.categories.at(connection, {
      channelCode: "",
      categoryCode: RandomGenerator.alphabets(5),
    });
  });

  // Test 2: Empty category code
  await TestValidator.error("should reject empty category code", async () => {
    await api.functional.shoppingMall.channels.categories.at(connection, {
      channelCode: validChannel.code,
      categoryCode: "",
    });
  });

  // Test 3: Both empty codes
  await TestValidator.error(
    "should reject both empty channel and category codes",
    async () => {
      await api.functional.shoppingMall.channels.categories.at(connection, {
        channelCode: "",
        categoryCode: "",
      });
    },
  );

  // Test 4: Channel code with common invalid characters
  const invalidChannelCodes = [
    "test channel", // space
    "test-channel with spaces",
    "test!channel", // exclamation
    "test@channel", // @ symbol
    "test#channel", // # symbol
  ];

  for (const channelCode of invalidChannelCodes) {
    await TestValidator.error(
      `should reject channel code with invalid characters: ${channelCode}`,
      async () => {
        await api.functional.shoppingMall.channels.categories.at(connection, {
          channelCode,
          categoryCode: RandomGenerator.alphabets(8),
        });
      },
    );
  }

  // Test 5: Category code with invalid characters
  const invalidCategoryCodes = [
    "test category", // space
    "test-category with spaces",
    "test!category", // exclamation
    "test@category", // @ symbol
    "test#category", // # symbol
  ];

  for (const categoryCode of invalidCategoryCodes) {
    await TestValidator.error(
      `should reject category code with invalid characters: ${categoryCode}`,
      async () => {
        await api.functional.shoppingMall.channels.categories.at(connection, {
          channelCode: validChannel.code,
          categoryCode,
        });
      },
    );
  }

  // Test 6: Very long codes (exceeding reasonable limits)
  const veryLongCode = RandomGenerator.alphabets(200); // 200 characters
  await TestValidator.error(
    "should reject extremely long channel code",
    async () => {
      await api.functional.shoppingMall.channels.categories.at(connection, {
        channelCode: veryLongCode,
        categoryCode: RandomGenerator.alphabets(5),
      });
    },
  );

  await TestValidator.error(
    "should reject extremely long category code",
    async () => {
      await api.functional.shoppingMall.channels.categories.at(connection, {
        channelCode: validChannel.code,
        categoryCode: veryLongCode,
      });
    },
  );

  // Test 7: Mixed invalid cases
  await TestValidator.error(
    "should reject mixed invalid characters",
    async () => {
      await api.functional.shoppingMall.channels.categories.at(connection, {
        channelCode: "test-channel-123!",
        categoryCode: RandomGenerator.alphabets(5),
      });
    },
  );

  await TestValidator.error(
    "should reject category code with mixed invalid characters",
    async () => {
      await api.functional.shoppingMall.channels.categories.at(connection, {
        channelCode: validChannel.code,
        categoryCode: "test-category#123",
      });
    },
  );

  // Test 8: Numeric-looking but invalid as category identifiers
  await TestValidator.error(
    "should reject purely numeric channel code",
    async () => {
      await api.functional.shoppingMall.channels.categories.at(connection, {
        channelCode: "123456789",
        categoryCode: RandomGenerator.alphabets(5),
      });
    },
  );
}
