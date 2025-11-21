import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test basic channel listing functionality without filters.
 *
 * This test validates the default behavior of the channel listing endpoint when
 * no search criteria are provided. It verifies that the system returns a
 * paginated list of all available shopping mall channels with proper summary
 * information including channel ID, name, description, and code.
 */
export async function test_api_channel_listing_basic(
  connection: api.IConnection,
) {
  // Call the channel listing API with minimal request parameters
  const response: IPageIShoppingMallChannel.ISummary =
    await api.functional.shoppingMall.channels.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    });

  // Validate the complete response structure using typia
  typia.assert(response);

  // Validate pagination structure exists
  TestValidator.predicate(
    "pagination structure exists",
    response.pagination !== undefined,
  );

  // Validate pagination business logic
  TestValidator.predicate(
    "current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is reasonable",
    response.pagination.limit > 0 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );

  // Validate data array contains valid channel summaries
  TestValidator.predicate(
    "data array contains valid items",
    response.data.every((channel) => {
      typia.assert(channel);
      return channel.id && channel.name && channel.code;
    }),
  );

  // Validate that channel codes are unique within the response
  const channelCodes = response.data.map((channel) => channel.code);
  const uniqueCodes = new Set(channelCodes);
  TestValidator.equals(
    "channel codes are unique in response",
    uniqueCodes.size,
    channelCodes.length,
  );
}
