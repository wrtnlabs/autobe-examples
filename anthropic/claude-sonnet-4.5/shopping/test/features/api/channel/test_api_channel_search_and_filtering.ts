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
 * Test comprehensive sales channel search and filtering functionality for
 * administrators.
 *
 * This test validates that admins can search and filter sales channels using
 * various criteria through the channel index API. The test creates an
 * authenticated admin account, sets up multiple test channels with different
 * configurations, and performs search operations to verify accurate filtering
 * and pagination.
 *
 * Test workflow:
 *
 * 1. Create and authenticate admin account to access channel management features
 * 2. Create multiple test sales channels with varying configurations
 * 3. Perform channel search with pagination parameters
 * 4. Validate search results include proper channel data structure
 * 5. Verify pagination metadata is accurate and complete
 * 6. Ensure all created channels are retrievable through the search API
 */
export async function test_api_channel_search_and_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminData = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create multiple test sales channels with different configurations
  const channelCount = 4;
  const createdChannels: IShoppingMallChannel[] = await ArrayUtil.asyncRepeat(
    channelCount,
    async (index) => {
      const channelData = {
        channel_code: `CH${RandomGenerator.alphaNumeric(6).toUpperCase()}_${index}`,
        channel_name: `${RandomGenerator.name()} Channel ${index + 1}`,
      } satisfies IShoppingMallChannel.ICreate;

      const channel: IShoppingMallChannel =
        await api.functional.shoppingMall.admin.channels.create(connection, {
          body: channelData,
        });
      typia.assert(channel);
      return channel;
    },
  );

  TestValidator.equals(
    "created channel count matches expected",
    createdChannels.length,
    channelCount,
  );

  // Step 3: Perform channel search with pagination
  const searchRequest = {
    page: 0,
  } satisfies IShoppingMallChannel.IRequest;

  const searchResult: IPageIShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 4 & 5: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is non-negative",
    searchResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit is positive",
    searchResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination total records includes created channels",
    searchResult.pagination.records >= channelCount,
  );

  TestValidator.predicate(
    "pagination total pages is valid",
    searchResult.pagination.pages > 0,
  );

  // Step 6: Verify all created channels are retrievable in search results
  TestValidator.predicate(
    "search result contains data array",
    searchResult.data.length > 0,
  );

  const allChannelsFound = createdChannels.every((createdChannel) =>
    searchResult.data.some(
      (resultChannel) => resultChannel.id === createdChannel.id,
    ),
  );

  TestValidator.predicate(
    "all created channels found in search results",
    allChannelsFound,
  );

  // Verify channel data structure completeness
  const sampleChannel = searchResult.data[0];
  typia.assert(sampleChannel);

  TestValidator.predicate(
    "channel has valid UUID id format",
    sampleChannel.id.length === 36,
  );

  TestValidator.predicate(
    "channel has non-empty channel_code",
    sampleChannel.channel_code.length > 0,
  );

  TestValidator.predicate(
    "channel has non-empty channel_name",
    sampleChannel.channel_name.length > 0,
  );
}
