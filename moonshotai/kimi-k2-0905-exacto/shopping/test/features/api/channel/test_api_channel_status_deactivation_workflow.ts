import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

export async function test_api_channel_status_deactivation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create active marketplace channel with full configuration
  const channelCode = RandomGenerator.alphabets(8);
  const originalChannelName = RandomGenerator.name(2);
  const originalCommissionRate = typia.random<
    number & tags.Minimum<1> & tags.Maximum<50>
  >();

  const activeChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: channelCode,
        name: originalChannelName,
        description:
          "Active marketplace channel for testing deactivation workflow",
        currency_code: "KRW",
        language: "ko",
        time_zone: "Asia/Seoul",
        commission_rate: originalCommissionRate,
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(activeChannel);

  // Validate initial channel is active
  TestValidator.equals(
    "channel should start as active",
    activeChannel.is_active,
    true,
  );
  TestValidator.equals(
    "channel code should match request",
    activeChannel.code,
    channelCode,
  );
  TestValidator.equals(
    "channel name should match request",
    activeChannel.name,
    originalChannelName,
  );
  TestValidator.predicate(
    "commission rate should be within valid range",
    activeChannel.commission_rate >= 1 && activeChannel.commission_rate <= 50,
  );

  // Step 2: Deactivate the channel by updating status to inactive
  const deactivatedChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.channels.update(connection, {
      channelCode: channelCode,
      body: {
        id: activeChannel.id,
        is_active: false,
      } satisfies IShoppingMallChannel.IUpdate,
    });
  typia.assert(deactivatedChannel);

  // Step 3: Verify transition to inactive status
  TestValidator.equals(
    "channel should be deactivated",
    deactivatedChannel.is_active,
    false,
  );
  TestValidator.equals(
    "channel ID should remain consistent",
    deactivatedChannel.id,
    activeChannel.id,
  );
  TestValidator.equals(
    "channel code should remain unchanged",
    deactivatedChannel.code,
    channelCode,
  );
  TestValidator.equals(
    "channel name should remain unchanged",
    deactivatedChannel.name,
    originalChannelName,
  );
  TestValidator.equals(
    "commission rate should remain unchanged",
    deactivatedChannel.commission_rate,
    originalCommissionRate,
  );
  TestValidator.equals(
    "currency should remain unchanged",
    deactivatedChannel.currency_code,
    "KRW",
  );
  TestValidator.equals(
    "language should remain unchanged",
    deactivatedChannel.language,
    "ko",
  );
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(deactivatedChannel.updated_at) >
      new Date(activeChannel.created_at),
  );

  // Step 4: Additional validation - Verify update operation doesn't affect other fields unexpectedly
  // Update other properties while keeping inactive status to test field independence
  const updatedChannelName = RandomGenerator.name(2);
  const updatedCommissionRate = originalCommissionRate + 2;

  const updatedChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.channels.update(connection, {
      channelCode: channelCode,
      body: {
        id: deactivatedChannel.id,
        name: updatedChannelName,
        commission_rate: updatedCommissionRate,
        description:
          "Updated channel configuration while maintaining inactive status",
        // Keep is_active false
      } satisfies IShoppingMallChannel.IUpdate,
    });
  typia.assert(updatedChannel);

  // Verify updates while maintaining inactive status
  TestValidator.equals(
    "channel should remain inactive after other updates",
    updatedChannel.is_active,
    false,
  );
  TestValidator.equals(
    "channel name should be updated",
    updatedChannel.name,
    updatedChannelName,
  );
  TestValidator.equals(
    "commission rate should be updated",
    updatedChannel.commission_rate,
    updatedCommissionRate,
  );
  TestValidator.equals(
    "description should be updated",
    updatedChannel.description,
    "Updated channel configuration while maintaining inactive status",
  );
  TestValidator.equals(
    "channel code should remain unchanged",
    updatedChannel.code,
    channelCode,
  );

  // Step 5: Test reactivation and cross-validation
  const reactivatedChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.channels.update(connection, {
      channelCode: channelCode,
      body: {
        id: updatedChannel.id,
        is_active: true,
      } satisfies IShoppingMallChannel.IUpdate,
    });
  typia.assert(reactivatedChannel);

  // Verify reactivation preserves all other properties
  TestValidator.equals(
    "channel should be reactivated",
    reactivatedChannel.is_active,
    true,
  );
  TestValidator.equals(
    "updated name should be preserved",
    reactivatedChannel.name,
    updatedChannelName,
  );
  TestValidator.equals(
    "updated commission rate should be preserved",
    reactivatedChannel.commission_rate,
    updatedCommissionRate,
  );
  TestValidator.equals(
    "updated description should be preserved",
    reactivatedChannel.description,
    "Updated channel configuration while maintaining inactive status",
  );

  // Validate timeline consistency
  TestValidator.predicate(
    "final updated_at should be most recent timestamp",
    new Date(reactivatedChannel.updated_at) >=
      new Date(updatedChannel.updated_at) &&
      new Date(updatedChannel.updated_at) >=
        new Date(deactivatedChannel.updated_at) &&
      new Date(deactivatedChannel.updated_at) >=
        new Date(activeChannel.updated_at),
  );

  // Validate all critical operational properties are preserved through status changes
  TestValidator.equals(
    "channel ID consistency throughout workflow",
    reactivatedChannel.id,
    activeChannel.id,
  );
  TestValidator.equals(
    "channel code consistency throughout workflow",
    reactivatedChannel.code,
    channelCode,
  );
  TestValidator.equals(
    "currency consistency throughout workflow",
    reactivatedChannel.currency_code,
    "KRW",
  );
  TestValidator.equals(
    "language consistency throughout workflow",
    reactivatedChannel.language,
    "ko",
  );
  TestValidator.equals(
    "timezone consistency throughout workflow",
    reactivatedChannel.time_zone,
    "Asia/Seoul",
  );
}
