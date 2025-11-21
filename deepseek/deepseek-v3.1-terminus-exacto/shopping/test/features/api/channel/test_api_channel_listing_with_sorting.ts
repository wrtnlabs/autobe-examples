import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Validate channel listing with various sorting options.
 *
 * This test systematically verifies that the shopping mall channel API
 * correctly sorts channels by different fields (name, code) in both ascending
 * and descending directions. It focuses on fields that can be reliably tested
 * with available data.
 */
export async function test_api_channel_listing_with_sorting(
  connection: api.IConnection,
) {
  // Focus on fields that can be reliably tested with the available response data
  const sortingFields = ["name", "code"] as const;
  const directions = ["asc", "desc"] as const;

  // Test each sorting field with both directions
  for (const field of sortingFields) {
    for (const direction of directions) {
      // Create request body with specific sorting parameters
      const requestBody = {
        page: 1,
        limit: 10,
        order_by: field,
        order_direction: direction,
      } satisfies IShoppingMallChannel.IRequest;

      // Call the API with sorting parameters
      const result: IPageIShoppingMallChannel.ISummary =
        await api.functional.shoppingMall.channels.index(connection, {
          body: requestBody,
        });

      // Validate the response structure
      typia.assert(result);

      // Verify pagination information
      TestValidator.predicate(
        "pagination should be valid",
        result.pagination.current === 1 &&
          result.pagination.limit === 10 &&
          result.pagination.records >= 0 &&
          result.pagination.pages >= 0,
      );

      // If we have data, validate sorting order
      if (result.data.length > 1) {
        // Extract the actual values for the current sorting field
        const values = result.data.map((channel) => {
          switch (field) {
            case "name":
              return channel.name;
            case "code":
              return channel.code;
            default:
              return channel.name;
          }
        });

        // Check if string values are sorted correctly using localeCompare
        let isSorted = true;
        for (let i = 1; i < values.length; i++) {
          const comparison = values[i].localeCompare(values[i - 1]);
          if (direction === "asc" && comparison < 0) {
            isSorted = false;
            break;
          }
          if (direction === "desc" && comparison > 0) {
            isSorted = false;
            break;
          }
        }

        TestValidator.predicate(
          `channels should be sorted by ${field} in ${direction} order`,
          isSorted,
        );
      }
    }
  }

  // Test default sorting (when no order_by specified)
  const defaultRequestBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallChannel.IRequest;

  const defaultResult: IPageIShoppingMallChannel.ISummary =
    await api.functional.shoppingMall.channels.index(connection, {
      body: defaultRequestBody,
    });

  typia.assert(defaultResult);
  TestValidator.predicate(
    "default sorting should return valid results",
    defaultResult.data.length >= 0,
  );

  // Test that sorting parameters are accepted without errors
  const statusSortRequestBody = {
    page: 1,
    limit: 5,
    order_by: "status",
    order_direction: "asc",
  } satisfies IShoppingMallChannel.IRequest;

  const statusResult: IPageIShoppingMallChannel.ISummary =
    await api.functional.shoppingMall.channels.index(connection, {
      body: statusSortRequestBody,
    });

  typia.assert(statusResult);
  TestValidator.predicate(
    "status sorting parameter should be accepted",
    statusResult.pagination.records >= 0,
  );
}
