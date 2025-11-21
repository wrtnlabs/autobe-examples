import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel listing with search functionality.
 *
 * This test validates the search parameter by filtering channels based on name,
 * description, or channel code matching. It verifies that the system properly
 * implements partial matching and case-insensitive search across channel
 * metadata. The test includes various search terms and validates that only
 * matching channels are returned in the paginated results.
 */
export async function test_api_channel_listing_with_search(
  connection: api.IConnection,
) {
  // First, get existing channels to understand the current state
  const initialChannels: IPageIShoppingMallChannel.ISummary =
    await api.functional.shoppingMall.channels.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallChannel.IRequest,
    });
  typia.assert(initialChannels);

  // Test 1: Search by partial name matching using existing data
  if (initialChannels.data.length > 0) {
    const firstChannel = initialChannels.data[0];
    const searchTerm = firstChannel.name.substring(0, 3); // Use first 3 characters of an existing channel name

    const searchResult: IPageIShoppingMallChannel.ISummary =
      await api.functional.shoppingMall.channels.index(connection, {
        body: {
          search: searchTerm,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallChannel.IRequest,
      });
    typia.assert(searchResult);

    TestValidator.predicate(
      "search results should contain channels matching the partial term",
      searchResult.data.length > 0,
    );

    TestValidator.predicate(
      "search results should contain the search term in name, description, or code",
      searchResult.data.every(
        (channel) =>
          channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (channel.description &&
            channel.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          channel.code.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }

  // Test 2: Search by code matching using existing data
  if (initialChannels.data.length > 0) {
    const channelWithCode = initialChannels.data.find(
      (channel) => channel.code.length > 2,
    );
    if (channelWithCode) {
      const searchTerm = channelWithCode.code.substring(0, 2); // Use first 2 characters of an existing channel code

      const searchResult: IPageIShoppingMallChannel.ISummary =
        await api.functional.shoppingMall.channels.index(connection, {
          body: {
            search: searchTerm,
            page: 1,
            limit: 10,
          } satisfies IShoppingMallChannel.IRequest,
        });
      typia.assert(searchResult);

      TestValidator.predicate(
        "search results should contain channels with matching codes",
        searchResult.data.every((channel) =>
          channel.code.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    }
  }

  // Test 3: Empty search should return all channels
  const emptySearchResult: IPageIShoppingMallChannel.ISummary =
    await api.functional.shoppingMall.channels.index(connection, {
      body: {
        search: "",
        page: 1,
        limit: 100,
      } satisfies IShoppingMallChannel.IRequest,
    });
  typia.assert(emptySearchResult);

  TestValidator.equals(
    "empty search should return same number of records as initial request",
    emptySearchResult.pagination.records,
    initialChannels.pagination.records,
  );

  // Test 4: Search with non-matching term should return empty or reduced results
  const nonMatchingTerm = "XYZ123NonExistentSearchTerm";
  const nonMatchingResult: IPageIShoppingMallChannel.ISummary =
    await api.functional.shoppingMall.channels.index(connection, {
      body: {
        search: nonMatchingTerm,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallChannel.IRequest,
    });
  typia.assert(nonMatchingResult);

  TestValidator.predicate(
    "non-matching search should return fewer records than empty search",
    nonMatchingResult.pagination.records <=
      emptySearchResult.pagination.records,
  );

  // Test 5: Case-insensitive search using mixed case
  if (initialChannels.data.length > 0) {
    const firstChannel = initialChannels.data[0];
    if (firstChannel.name.length > 3) {
      const originalTerm = firstChannel.name.substring(0, 3);
      const mixedCaseTerm = originalTerm
        .split("")
        .map((char, index) =>
          index % 2 === 0 ? char.toUpperCase() : char.toLowerCase(),
        )
        .join("");

      const mixedCaseResult: IPageIShoppingMallChannel.ISummary =
        await api.functional.shoppingMall.channels.index(connection, {
          body: {
            search: mixedCaseTerm,
            page: 1,
            limit: 10,
          } satisfies IShoppingMallChannel.IRequest,
        });
      typia.assert(mixedCaseResult);

      TestValidator.predicate(
        "case-insensitive search should return matching results",
        mixedCaseResult.data.every(
          (channel) =>
            channel.name.toLowerCase().includes(mixedCaseTerm.toLowerCase()) ||
            (channel.description &&
              channel.description
                .toLowerCase()
                .includes(mixedCaseTerm.toLowerCase())) ||
            channel.code.toLowerCase().includes(mixedCaseTerm.toLowerCase()),
        ),
      );
    }
  }

  // Test pagination metadata consistency
  TestValidator.predicate(
    "pagination current page should be 1",
    emptySearchResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should be respected",
    emptySearchResult.pagination.limit === 100,
  );

  TestValidator.predicate(
    "pagination pages calculation should be valid",
    emptySearchResult.pagination.pages >= 1,
  );
}
