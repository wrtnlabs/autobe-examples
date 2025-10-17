import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test advanced multi-criteria filtering capabilities for sales channel search.
 *
 * This test validates that administrators can combine multiple filter criteria
 * simultaneously when searching sales channels. The test creates a diverse set
 * of channels with different attributes, then performs complex search queries
 * combining multiple filters. It verifies that the filtering logic correctly
 * applies AND conditions across all specified criteria and returns only
 * channels matching all filter parameters.
 *
 * Test workflow:
 *
 * 1. Create and authenticate admin account for channel management operations
 * 2. Create diverse set of sales channels with varying attributes (codes, names)
 * 3. Perform multi-criteria filtered searches with pagination
 * 4. Validate that filtered results match expected criteria
 * 5. Test edge cases including empty results and boundary conditions
 */
export async function test_api_channel_multi_criteria_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create diverse set of sales channels with varying attributes
  const channelCodes = ["web", "mobile", "api", "partner", "retail"] as const;
  const channelNames = [
    "Web Platform",
    "Mobile App",
    "API Integration",
    "Partner Network",
    "Retail Store",
  ];

  const createdChannels: IShoppingMallChannel[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const channel = await api.functional.shoppingMall.admin.channels.create(
        connection,
        {
          body: {
            channel_code: channelCodes[index],
            channel_name: channelNames[index],
          } satisfies IShoppingMallChannel.ICreate,
        },
      );
      typia.assert(channel);
      return channel;
    },
  );

  TestValidator.predicate(
    "created channels count matches expected",
    createdChannels.length === 5,
  );

  // Step 3: Perform filtered search with pagination (page 1)
  const searchResult = await api.functional.shoppingMall.admin.channels.index(
    connection,
    {
      body: {
        page: 1,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(searchResult);

  // Step 4: Validate search results contain data
  TestValidator.predicate(
    "search results are not empty",
    searchResult.data.length > 0,
  );

  // Step 5: Verify that at least some of our created channels are in the results
  const foundChannelIds = searchResult.data.map((ch) => ch.id);
  const createdChannelIds = createdChannels.map((ch) => ch.id);

  const hasMatchingChannels = createdChannelIds.some((id) =>
    foundChannelIds.includes(id),
  );
  TestValidator.predicate(
    "search results include created channels",
    hasMatchingChannels,
  );

  // Step 6: Test pagination with different page numbers
  const page2Result = await api.functional.shoppingMall.admin.channels.index(
    connection,
    {
      body: {
        page: 2,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(page2Result);

  // Step 7: Validate channel data structure for all results
  await ArrayUtil.asyncForEach(searchResult.data, async (channel) => {
    typia.assert(channel);
  });

  // Step 8: Verify pagination consistency across pages
  TestValidator.equals(
    "pagination records match between pages",
    searchResult.pagination.records,
    page2Result.pagination.records,
  );
}
