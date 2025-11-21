import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel filtering by operational status (active/inactive)
 *
 * This test validates the channel filtering functionality based on active
 * status. It tests three scenarios:
 *
 * 1. Filter for active channels only (isActive=true)
 * 2. Filter for inactive channels only (isActive=false)
 * 3. No status filter (returns all channels with mixed statuses)
 *
 * The test ensures proper categorization of channels and validates that the
 * filtering mechanism works correctly with various combinations of filters.
 */
export async function test_api_channel_filter_by_active_status(
  connection: api.IConnection,
) {
  // Test 1: Filter for active channels only
  const activeChannels = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        isActive: typia.random<boolean>() satisfies boolean | undefined,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(activeChannels);

  // Validate all returned channels are active
  TestValidator.equals(
    "active channels should contain only active channels",
    activeChannels.data.every((channel) => channel.is_active === true),
    true,
  );

  // Test 2: Filter for inactive channels only
  const inactiveChannels = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        isActive: false satisfies boolean | undefined,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(inactiveChannels);

  // Validate all returned channels are inactive
  TestValidator.equals(
    "inactive channels should contain only inactive channels",
    inactiveChannels.data.every((channel) => channel.is_active === false),
    true,
  );

  // Test 3: Get all channels without status filter
  const allChannels = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {} satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(allChannels);

  // Verify all channels array contains both active and inactive channels
  TestValidator.equals(
    "all channels should contain both active and inactive when mixed",
    allChannels.data.some((channel) => channel.is_active === true) &&
      allChannels.data.some((channel) => channel.is_active === false),
    true,
  );

  // Test 4: Combine status filter with pagination
  const paginatedActive = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        isActive: true,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(paginatedActive);

  TestValidator.predicate(
    "paginated response should respect page and limit",
    paginatedActive.data.length <= 5,
  );

  // Test 5: combine status filter with search
  const searchActive = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        isActive: true,
        search: RandomGenerator.name(1),
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(searchActive);

  // Validate search results contain matching active channels
  TestValidator.equals(
    "search results should contain only active channels",
    searchActive.data.every((channel) => channel.is_active === true),
    true,
  );

  // Test 6: combine status filter with sorting
  const sortedActive = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        isActive: true,
        sortBy: "name",
        sortOrder: "asc",
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(sortedActive);

  // Validate sorting by checking first few items are in order
  TestValidator.predicate(
    "channels should be sorted by name in ascending order",
    sortedActive.data.length <= 1 ||
      sortedActive.data
        .slice(0, sortedActive.data.length - 1)
        .every((channel, index) => {
          return channel.name <= sortedActive.data[index + 1].name;
        }),
  );
}
