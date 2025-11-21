import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test creation of a marketplace channel with complete configuration including
 * all required and optional parameters. This scenario validates successful
 * channel creation with comprehensive business settings including currency,
 * language, commission rate, timezone, and descriptive metadata. It verifies
 * that properly configured channels are created successfully and returned with
 * complete information including system-generated identifiers and timestamps.
 */
export async function test_api_channel_creation_complete_config(
  connection: api.IConnection,
) {
  // Generate random channel configuration with all required and optional parameters
  const channelCreateData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    currency_code: "usd",
    language: "english",
    time_zone: "utc",
    commission_rate: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallChannel.ICreate;

  // Create the channel via API
  const createdChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: channelCreateData,
    },
  );
  typia.assert(createdChannel);

  // Validate that the created channel contains the expected data
  TestValidator.equals(
    "channel code matches",
    createdChannel.code,
    channelCreateData.code,
  );
  TestValidator.equals(
    "channel name matches",
    createdChannel.name,
    channelCreateData.name,
  );
  TestValidator.equals(
    "channel description matches",
    createdChannel.description,
    channelCreateData.description,
  );
  TestValidator.equals(
    "currency matches",
    createdChannel.currency_code,
    channelCreateData.currency_code,
  );
  TestValidator.equals(
    "language matches",
    createdChannel.language,
    channelCreateData.language,
  );
  TestValidator.equals(
    "timezone matches",
    createdChannel.time_zone,
    channelCreateData.time_zone,
  );
  TestValidator.equals(
    "commission rate matches",
    createdChannel.commission_rate,
    channelCreateData.commission_rate,
  );

  // Verify system-generated fields
  TestValidator.predicate(
    "has UUID id",
    typia.is<string & tags.Format<"uuid">>(createdChannel.id),
  );
  TestValidator.predicate(
    "is active by default",
    createdChannel.is_active === true,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    createdChannel.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    createdChannel.updated_at.length > 0,
  );

  // Validate timestamp format
  const createdAt = new Date(createdChannel.created_at);
  const updatedAt = new Date(createdChannel.updated_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "timestamps are recent",
    Date.now() - createdAt.getTime() < 5000,
  );
}
