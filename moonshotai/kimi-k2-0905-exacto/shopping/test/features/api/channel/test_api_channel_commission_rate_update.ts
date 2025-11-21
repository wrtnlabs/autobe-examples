import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

export async function test_api_channel_commission_rate_update(
  connection: api.IConnection,
) {
  // Step 1: Create channel with initial commission rate
  const initialChannelData = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    currency_code: RandomGenerator.pick(["USD", "EUR", "KRW"] as const),
    language: RandomGenerator.pick(["en-US", "ko-KR", "ja-JP"] as const),
    time_zone: "UTC",
    commission_rate: 15.5,
  } satisfies IShoppingMallChannel.ICreate;

  const initialChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: initialChannelData,
    },
  );
  typia.assert(initialChannel);

  TestValidator.equals(
    "initial commission rate",
    initialChannel.commission_rate,
    initialChannelData.commission_rate,
  );

  // Step 2: Test commission rate increase
  const increasedRate = 25.0;
  const increasedChannel = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: initialChannel.code,
      body: {
        id: initialChannel.id,
        commission_rate: increasedRate,
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );

  typia.assert(increasedChannel);
  TestValidator.equals(
    "increased commission rate",
    increasedChannel.commission_rate,
    increasedRate,
  );
  TestValidator.predicate(
    "rate increased",
    increasedChannel.commission_rate > initialChannel.commission_rate,
  );

  // Step 3: Test commission rate decrease
  const decreasedRate = 10.0;
  const decreasedChannel = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: initialChannel.code,
      body: {
        id: initialChannel.id,
        commission_rate: decreasedRate,
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );

  typia.assert(decreasedChannel);
  TestValidator.equals(
    "decreased commission rate",
    decreasedChannel.commission_rate,
    decreasedRate,
  );
  TestValidator.predicate(
    "rate decreased",
    decreasedChannel.commission_rate < increasedChannel.commission_rate,
  );

  // Step 4: Test boundary values - 0% minimum
  const zeroRateChannel = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: initialChannel.code,
      body: {
        id: initialChannel.id,
        commission_rate: 0,
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );

  typia.assert(zeroRateChannel);
  TestValidator.equals(
    "zero commission rate",
    zeroRateChannel.commission_rate,
    0,
  );

  // Step 5: Test boundary values - 100% maximum
  const maxRateChannel = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: initialChannel.code,
      body: {
        id: initialChannel.id,
        commission_rate: 100,
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );

  typia.assert(maxRateChannel);
  TestValidator.equals(
    "maximum commission rate",
    maxRateChannel.commission_rate,
    100,
  );

  // Step 6: Test decimal commission rates
  const decimalRate = 23.75;
  const decimalChannel = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: initialChannel.code,
      body: {
        id: initialChannel.id,
        commission_rate: decimalRate,
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );

  typia.assert(decimalChannel);
  TestValidator.equals(
    "decimal commission rate",
    decimalChannel.commission_rate,
    decimalRate,
  );

  // Step 7: Test data integrity - updated_at should change
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(maxRateChannel.updated_at).getTime() >
      new Date(initialChannel.updated_at).getTime(),
  );

  // Step 8: Test error scenarios
  await TestValidator.error(
    "negative commission rate should fail",
    async () => {
      await api.functional.shoppingMall.channels.update(connection, {
        channelCode: initialChannel.code,
        body: {
          id: initialChannel.id,
          commission_rate: -1,
        } satisfies IShoppingMallChannel.IUpdate,
      });
    },
  );

  await TestValidator.error(
    "commission rate over 100 should fail",
    async () => {
      await api.functional.shoppingMall.channels.update(connection, {
        channelCode: initialChannel.code,
        body: {
          id: initialChannel.id,
          commission_rate: 101,
        } satisfies IShoppingMallChannel.IUpdate,
      });
    },
  );

  // Step 9: Test non-existent channel (error handling)
  await TestValidator.error(
    "update non-existent channel should fail",
    async () => {
      await api.functional.shoppingMall.channels.update(connection, {
        channelCode: RandomGenerator.alphabets(10),
        body: {
          id: initialChannel.id,
          commission_rate: 15,
        } satisfies IShoppingMallChannel.IUpdate,
      });
    },
  );

  // Step 10: Test commission rate with property updates
  const updatedChannelData = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    commission_rate: 12.5,
  } satisfies Partial<IShoppingMallChannel.IUpdate>;

  const combinedUpdate = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: initialChannel.code,
      body: {
        id: initialChannel.id,
        ...updatedChannelData,
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );

  typia.assert(combinedUpdate);
  TestValidator.equals(
    "updated name",
    combinedUpdate.name,
    updatedChannelData.name,
  );
  TestValidator.equals(
    "updated description",
    combinedUpdate.description,
    updatedChannelData.description,
  );
  TestValidator.equals(
    "updated commission rate",
    combinedUpdate.commission_rate,
    updatedChannelData.commission_rate,
  );
  TestValidator.predicate(
    "rate is in valid range",
    combinedUpdate.commission_rate >= 0 &&
      combinedUpdate.commission_rate <= 100,
  );

  // Step 11: Test seller agreement compatibility - verify commission rate precision
  TestValidator.predicate(
    "commission rate precision maintained",
    Number.isFinite(combinedUpdate.commission_rate),
  );
  TestValidator.predicate(
    "commission rate within business bounds",
    combinedUpdate.commission_rate >= 0 &&
      combinedUpdate.commission_rate <= 100,
  );
}
