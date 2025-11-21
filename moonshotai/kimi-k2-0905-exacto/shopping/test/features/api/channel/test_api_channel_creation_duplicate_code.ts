import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel creation with duplicate code validation.
 *
 * This test verifies that the shopping mall platform properly enforces channel
 * code uniqueness constraints. It creates an initial channel with a specific
 * code, then attempts to create another channel with the same code to ensure
 * the system rejects duplicate identifiers.
 *
 * The test validates:
 *
 * 1. Successful creation of initial channel with unique code
 * 2. Proper rejection of duplicate channel code attempts
 * 3. Appropriate error handling for uniqueness constraint violations
 * 4. System maintains data integrity through code uniqueness enforcement
 */
export async function test_api_channel_creation_duplicate_code(
  connection: api.IConnection,
) {
  // Step 1: Create initial channel with specific code
  const initialChannelCode = `channel_${RandomGenerator.alphaNumeric(8)}`;
  const initialChannelData = {
    code: initialChannelCode,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    currency_code: "USD",
    language: "en",
    time_zone: "America/New_York",
    commission_rate: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallChannel.ICreate;

  const initialChannel = await api.functional.shoppingMall.channels.create(
    connection,
    { body: initialChannelData },
  );
  typia.assert(initialChannel);

  // Step 2: Attempt to create channel with duplicate code
  await TestValidator.error(
    "duplicate channel code should be rejected",
    async () => {
      const duplicateChannelData = {
        code: initialChannelCode, // Same code as initial channel
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        currency_code: "EUR",
        language: "fr",
        time_zone: "Europe/Paris",
        commission_rate: typia.random<
          number & tags.Minimum<0> & tags.Maximum<100>
        >(),
      } satisfies IShoppingMallChannel.ICreate;

      await api.functional.shoppingMall.channels.create(connection, {
        body: duplicateChannelData,
      });
    },
  );

  // Step 3: Verify initial channel remains intact
  TestValidator.equals(
    "initial channel code preserved",
    initialChannel.code,
    initialChannelCode,
  );
  TestValidator.predicate(
    "initial channel is active",
    initialChannel.is_active,
  );
}
