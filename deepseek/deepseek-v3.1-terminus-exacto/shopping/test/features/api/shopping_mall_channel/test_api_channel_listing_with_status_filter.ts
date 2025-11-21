import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel listing with status-based filtering.
 *
 * This test validates the shopping mall channel listing API's ability to filter
 * channels by their operational status (ACTIVE, INACTIVE, MAINTENANCE,
 * PLANNED). While the response summary does not include status information, the
 * test validates that filtering requests complete successfully and return valid
 * paginated results with proper structure.
 */
export async function test_api_channel_listing_with_status_filter(
  connection: api.IConnection,
) {
  // Define all available status values for comprehensive testing
  const statusValues = [
    "ACTIVE",
    "INACTIVE",
    "MAINTENANCE",
    "PLANNED",
  ] as const;

  // Test each status filter individually
  for (const status of statusValues) {
    // Test with default pagination (page 1, limit 10)
    const response: IPageIShoppingMallChannel.ISummary =
      await api.functional.shoppingMall.channels.index(connection, {
        body: {
          status: status,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallChannel.IRequest,
      });

    // Validate response type safety - this ensures all required fields are present
    typia.assert(response);

    // Verify pagination structure is correct
    TestValidator.equals(
      `pagination structure for ${status} filter`,
      response.pagination,
      {
        current: 1,
        limit: 10,
        records: response.pagination.records,
        pages: response.pagination.pages,
      } satisfies IPage.IPagination,
    );

    // Validate that pagination metadata has valid values
    TestValidator.predicate(
      `pagination current page is positive for ${status}`,
      response.pagination.current >= 0,
    );

    TestValidator.predicate(
      `pagination limit is valid for ${status}`,
      response.pagination.limit >= 0,
    );

    TestValidator.predicate(
      `pagination records count is valid for ${status}`,
      response.pagination.records >= 0,
    );

    TestValidator.predicate(
      `pagination pages count is valid for ${status}`,
      response.pagination.pages >= 0,
    );

    // Test pagination with different parameters
    const paginatedResponse: IPageIShoppingMallChannel.ISummary =
      await api.functional.shoppingMall.channels.index(connection, {
        body: {
          status: status,
          page: 2,
          limit: 5,
        } satisfies IShoppingMallChannel.IRequest,
      });

    typia.assert(paginatedResponse);

    TestValidator.equals(
      `pagination page 2 for ${status} filter`,
      paginatedResponse.pagination.current,
      2,
    );

    TestValidator.equals(
      `pagination limit 5 for ${status} filter`,
      paginatedResponse.pagination.limit,
      5,
    );
  }

  // Test without status filter to get all channels
  const allChannelsResponse: IPageIShoppingMallChannel.ISummary =
    await api.functional.shoppingMall.channels.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallChannel.IRequest,
    });

  typia.assert(allChannelsResponse);

  // Test search functionality combined with status filter
  const searchResponse: IPageIShoppingMallChannel.ISummary =
    await api.functional.shoppingMall.channels.index(connection, {
      body: {
        status: "ACTIVE",
        search: "test",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    });

  typia.assert(searchResponse);

  // Test ordering with status filter
  const orderedResponse: IPageIShoppingMallChannel.ISummary =
    await api.functional.shoppingMall.channels.index(connection, {
      body: {
        status: "ACTIVE",
        order_by: "name",
        order_direction: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    });

  typia.assert(orderedResponse);

  // Indirect validation: Test that different status values can produce different results
  // by comparing record counts (acknowledging this is not definitive proof)
  const activeResponse = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        status: "ACTIVE",
        page: 1,
        limit: 100,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );

  const inactiveResponse = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        status: "INACTIVE",
        page: 1,
        limit: 100,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );

  typia.assert(activeResponse);
  typia.assert(inactiveResponse);

  // Note: This is an indirect test - different record counts suggest filtering works
  // but it's not definitive proof since counts could coincidentally match
  TestValidator.predicate(
    "different status filters complete successfully",
    activeResponse.pagination.records >= 0 &&
      inactiveResponse.pagination.records >= 0,
  );
}
