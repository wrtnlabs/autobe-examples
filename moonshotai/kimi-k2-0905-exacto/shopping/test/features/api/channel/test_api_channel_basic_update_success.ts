import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

export async function test_api_channel_basic_update_success(
  connection: api.IConnection,
) {
  // Create initial channel for update testing
  const createData = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    currency_code: RandomGenerator.pick(["USD", "EUR", "GBP", "JPY", "KRW"]),
    language: RandomGenerator.pick(["en", "es", "fr", "de", "ja", "ko"]),
    time_zone: "UTC",
    commission_rate: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallChannel.ICreate;

  const initialChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: createData,
    },
  );
  typia.assert(initialChannel);

  // Update channel with comprehensive changes
  const updateData = {
    id: initialChannel.id,
    code: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: !initialChannel.is_active,
    currency_code: RandomGenerator.pick([
      "USD",
      "EUR",
      "GBP",
      "JPY",
      "KRW",
      "CNY",
    ]),
    language: RandomGenerator.pick(["en", "es", "fr", "de", "ja", "ko", "zh"]),
    time_zone: "America/New_York",
    commission_rate: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallChannel.IUpdate;

  const updatedChannel = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: initialChannel.code,
      body: updateData,
    },
  );
  typia.assert(updatedChannel);

  // Verify all updates were applied correctly
  TestValidator.equals(
    "channel ID preserved",
    updatedChannel.id,
    initialChannel.id,
  );
  TestValidator.equals(
    "channel code updated",
    updatedChannel.code,
    updateData.code,
  );
  TestValidator.equals(
    "channel name updated",
    updatedChannel.name,
    updateData.name,
  );
  TestValidator.equals(
    "channel description updated",
    updatedChannel.description,
    updateData.description,
  );
  TestValidator.equals(
    "channel active status updated",
    updatedChannel.is_active,
    updateData.is_active,
  );
  TestValidator.equals(
    "channel currency updated",
    updatedChannel.currency_code,
    updateData.currency_code,
  );
  TestValidator.equals(
    "channel language updated",
    updatedChannel.language,
    updateData.language,
  );
  TestValidator.equals(
    "channel timezone updated",
    updatedChannel.time_zone,
    updateData.time_zone,
  );
  TestValidator.equals(
    "channel commission rate updated",
    updatedChannel.commission_rate,
    updateData.commission_rate,
  );

  // Verify timestamps were updated
  TestValidator.predicate(
    "updated_at timestamp changed",
    updatedChannel.updated_at !== initialChannel.updated_at,
  );
  TestValidator.predicate(
    "created_at timestamp preserved",
    updatedChannel.created_at === initialChannel.created_at,
  );

  // Verify partial updates work - update only specific fields
  const partialUpdateData = {
    id: updatedChannel.id,
    name: RandomGenerator.name(),
    commission_rate: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallChannel.IUpdate;

  const partiallyUpdatedChannel =
    await api.functional.shoppingMall.channels.update(connection, {
      channelCode: updatedChannel.code,
      body: partialUpdateData,
    });
  typia.assert(partiallyUpdatedChannel);

  // Verify partial update results
  TestValidator.equals(
    "channel ID preserved on partial update",
    partiallyUpdatedChannel.id,
    updatedChannel.id,
  );
  TestValidator.equals(
    "channel name updated on partial update",
    partiallyUpdatedChannel.name,
    partialUpdateData.name,
  );
  TestValidator.equals(
    "channel commission rate updated on partial update",
    partiallyUpdatedChannel.commission_rate,
    partialUpdateData.commission_rate,
  );
  TestValidator.equals(
    "unchanged fields preserved - code",
    partiallyUpdatedChannel.code,
    updatedChannel.code,
  );
  TestValidator.equals(
    "unchanged fields preserved - description",
    partiallyUpdatedChannel.description,
    updatedChannel.description,
  );
  TestValidator.equals(
    "unchanged fields preserved - is_active",
    partiallyUpdatedChannel.is_active,
    updatedChannel.is_active,
  );
  TestValidator.equals(
    "unchanged fields preserved - currency",
    partiallyUpdatedChannel.currency_code,
    updatedChannel.currency_code,
  );
  TestValidator.equals(
    "unchanged fields preserved - language",
    partiallyUpdatedChannel.language,
    updatedChannel.language,
  );
  TestValidator.equals(
    "unchanged fields preserved - timezone",
    partiallyUpdatedChannel.time_zone,
    updatedChannel.time_zone,
  );
}
