import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel creation with minimal required parameters for multi-marketplace
 * operations.
 *
 * This test validates the core channel creation functionality by providing only
 * the essential parameters needed to establish a marketplace channel. Channels
 * represent distinct selling environments within the shopping mall platform,
 * enabling businesses to operate multiple marketplace configurations under
 * unified infrastructure.
 *
 * The test demonstrates:
 *
 * 1. Channel creation with minimal required fields: code, name, currency,
 *    language, commission
 * 2. Omission of optional parameters: description and time_zone
 * 3. System's ability to handle missing optional fields appropriately
 * 4. Proper channel ID generation and timestamp management
 * 5. Default active status configuration
 *
 * This validates that sellers can create channels quickly for rapid marketplace
 * deployment without being required to provide extensive optional information
 * during initial setup.
 */
export async function test_api_channel_creation_minimal_required(
  connection: api.IConnection,
) {
  // Generate minimal channel creation data with only required fields
  const channelCode = RandomGenerator.alphabets(8);
  const channelName = RandomGenerator.name();

  // Create channel with minimal required fields
  const createBody = {
    code: channelCode,
    name: channelName,
    currency_code: "USD",
    language: "en",
    commission_rate: 5.5,
  } satisfies IShoppingMallChannel.ICreate;

  // Execute API call with mandatory await
  const channel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: createBody,
    },
  );

  // Validate response structure and required fields
  typia.assert(channel);

  // Verify all required fields are present
  TestValidator.equals("channel code matches", channel.code, channelCode);
  TestValidator.equals("channel name matches", channel.name, channelName);
  TestValidator.equals("currency code", channel.currency_code, "USD");
  TestValidator.equals("language", channel.language, "en");
  TestValidator.equals("commission rate", channel.commission_rate, 5.5);

  // Verify optional fields are handled (null or undefined as allowed)
  TestValidator.predicate(
    "description is optional",
    channel.description === undefined || channel.description === null,
  );
  TestValidator.predicate(
    "time_zone is optional",
    channel.time_zone === undefined || channel.time_zone === null,
  );

  // Verify system-generated fields
  TestValidator.predicate("id is generated", channel.id !== undefined);
  TestValidator.predicate(
    "created_at is generated",
    channel.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is generated",
    channel.updated_at !== undefined,
  );

  // Verify default active status
  TestValidator.equals("is_active default", channel.is_active, true);
}
