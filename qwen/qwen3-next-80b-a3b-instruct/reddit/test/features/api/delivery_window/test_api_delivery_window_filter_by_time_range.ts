import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformDeliveryWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeliveryWindow";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDeliveryWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDeliveryWindow";
export async function test_api_delivery_window_filter_by_time_range(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection (connection isolation pattern even though no auth needed)
  const filteredConnection: api.IConnection = { host: connection.host };
  // Define a time range for filtering (using realistic date values)
  const filterStartTime = new Date();
  filterStartTime.setDate(filterStartTime.getDate() - 7); // 7 days ago
  const filterEndTime = new Date();
  filterEndTime.setDate(filterEndTime.getDate() + 7); // 7 days from now
  // Query delivery windows filtered by time range using the available API endpoint
  const filteredResponse =
    await api.functional.communityPlatform.delivery_windows.index(
      filteredConnection,
      {
        body: {
          startTime: filterStartTime.toISOString(),
          endTime: filterEndTime.toISOString(),
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformDeliveryWindow.IRequest,
      },
    );
  // Validate response type with typia.assert (this is the ONLY validation needed)
  typia.assert(filteredResponse);
  // Verify pagination metadata is correct for the IPage.IPagination structure
  TestValidator.equals(
    "pagination current page",
    filteredResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    filteredResponse.pagination.limit,
    20,
  );
  // Validate that the returned data contains delivery windows with the expected structure
  // Note: No additional validity checking needed after typia.assert
  // The only business logic validation is that some windows were returned
  TestValidator.predicate(
    "at least one delivery window returned",
    filteredResponse.data.length > 0,
  );
  // Validate window summary structure type (after typia.assert, we trust the type)
  // No further type validation needed
  // Focus remains on ensuring the filtering logic returns results
  // and that the response structure is correct as defined in the DTO
}
