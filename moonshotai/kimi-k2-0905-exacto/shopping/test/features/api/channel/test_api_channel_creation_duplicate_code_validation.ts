import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel creation with duplicate channel code validation.
 *
 * This test validates that the marketplace channel creation system enforces
 * uniqueness constraints on channel codes, preventing duplicate identifiers
 * within the platform. Channel codes serve as unique identifiers for
 * marketplace environments and must be unique across the entire system.
 *
 * The test demonstrates proper error handling and business rule validation for
 * channel management, ensuring data integrity and preventing conflicts in
 * multi-marketplace scenarios.
 *
 * Test steps:
 *
 * 1. Create initial channel with specific code
 * 2. Attempt to create duplicate channel with same code
 * 3. Validate that duplicate creation fails with appropriate error
 */
export async function test_api_channel_creation_duplicate_code_validation(
  connection: api.IConnection,
) {
  // Step 1: Create initial channel with specific code
  const channelData = {
    code: "test-channel-" + RandomGenerator.alphaNumeric(8),
    name: "Test Channel for Duplicate Validation",
    currency_code: "USD",
    language: "en",
    commission_rate: 5.0,
    description: "Channel created for testing duplicate code validation",
  } satisfies IShoppingMallChannel.ICreate;

  const firstChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: channelData,
    },
  );
  typia.assert(firstChannel);

  // Step 2: Attempt to create duplicate channel with same code
  await TestValidator.error(
    "duplicate channel code creation should fail",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          ...channelData,
          name: "Duplicate Channel Name",
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  // Step 3: Verify that initial channel still exists and is valid
  TestValidator.predicate(
    "original channel creation was successful",
    firstChannel.code === channelData.code &&
      firstChannel.name === channelData.name &&
      ArrayUtil.repeat(3, () => firstChannel.commission_rate).every(
        (rate) => rate === channelData.commission_rate,
      ),
  );
}
