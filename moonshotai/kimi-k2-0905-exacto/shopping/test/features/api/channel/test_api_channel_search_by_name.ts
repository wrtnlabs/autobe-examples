import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

export async function test_api_channel_search_by_name(
  connection: api.IConnection,
) {
  // Step 1: Get all channels to understand available data
  const allChannels = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(allChannels);

  TestValidator.predicate(
    "should retrieve channels successfully",
    allChannels.data.length >= 0 && allChannels.pagination !== undefined,
  );

  // Step 2: Test partial name search if we have channels
  if (allChannels.data.length > 0) {
    const sampleChannel = RandomGenerator.pick(allChannels.data);
    const searchTerm = RandomGenerator.substring(sampleChannel.name);

    const partialSearch = await api.functional.shoppingMall.channels.index(
      connection,
      {
        body: {
          search: searchTerm,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallChannel.IRequest,
      },
    );
    typia.assert(partialSearch);

    TestValidator.predicate(
      "partial search should return channels containing the search term",
      partialSearch.data.length > 0 &&
        partialSearch.data.some(
          (channel) =>
            channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            channel.description
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()),
        ),
    );
  }

  // Step 3: Test description search
  if (allChannels.data.length > 0) {
    const channelWithDescription = allChannels.data.find((c) => c.description);
    if (channelWithDescription) {
      const descriptionTerm = RandomGenerator.substring(
        channelWithDescription.description!,
      );

      const descriptionSearch =
        await api.functional.shoppingMall.channels.index(connection, {
          body: {
            search: descriptionTerm,
            page: 1,
            limit: 20,
          } satisfies IShoppingMallChannel.IRequest,
        });
      typia.assert(descriptionSearch);

      TestValidator.predicate(
        "description search should find channels containing search term",
        descriptionSearch.data.length > 0,
      );
    }
  }

  // Step 4: Test case insensitive search
  if (allChannels.data.length > 0) {
    const sampleChannel = RandomGenerator.pick(allChannels.data);
    const upperCaseSearch = sampleChannel.name.toUpperCase();

    const caseInsensitiveSearch =
      await api.functional.shoppingMall.channels.index(connection, {
        body: {
          search: upperCaseSearch,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallChannel.IRequest,
      });
    typia.assert(caseInsensitiveSearch);

    TestValidator.predicate(
      "case insensitive search should work",
      caseInsensitiveSearch.data.length > 0,
    );
  }

  // Step 5: Test no results scenario
  const noResultsSearch = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        search: "nonexistentchannelname12345xyz",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(noResultsSearch);

  TestValidator.equals(
    "search with no matches should return empty data",
    noResultsSearch.data,
    [],
  );

  // Step 6: Test pagination with search
  if (allChannels.data.length >= 2) {
    // Use a common search term that should return multiple results
    const commonTerm = "store";

    const paginatedResults = await api.functional.shoppingMall.channels.index(
      connection,
      {
        body: {
          search: commonTerm,
          page: 1,
          limit: 2,
        } satisfies IShoppingMallChannel.IRequest,
      },
    );
    typia.assert(paginatedResults);

    TestValidator.predicate(
      "paginated search should respect limit",
      paginatedResults.data.length <= 2,
    );
    TestValidator.equals(
      "paginated search should have correct limit in pagination",
      paginatedResults.pagination.limit,
      2,
    );
  }

  // Step 7: Test filtered search combining search with other criteria
  if (allChannels.data.length > 0) {
    // Get all active USD channels first
    const usdChannels = await api.functional.shoppingMall.channels.index(
      connection,
      {
        body: {
          currencyCode: "USD",
          isActive: true,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallChannel.IRequest,
      },
    );

    if (usdChannels.data.length > 0) {
      // Now search within those results
      const searchTerm = RandomGenerator.substring(usdChannels.data[0].name);

      const filteredSearch = await api.functional.shoppingMall.channels.index(
        connection,
        {
          body: {
            search: searchTerm,
            isActive: true,
            currencyCode: "USD",
            page: 1,
            limit: 20,
          } satisfies IShoppingMallChannel.IRequest,
        },
      );
      typia.assert(filteredSearch);

      TestValidator.predicate(
        "filtered search should apply all criteria",
        filteredSearch.data.every(
          (channel) =>
            (channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              channel.description
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase())) &&
            channel.is_active === true &&
            channel.currency_code === "USD",
        ),
      );
    }
  }

  // Step 8: Test empty search (should return channels not filtered by search)
  const emptySearch = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        search: "",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(emptySearch);

  TestValidator.predicate(
    "empty search should return channels when they exist",
    emptySearch.data.length > 0 ||
      (emptySearch.pagination.records === 0 && emptySearch.data.length === 0),
  );

  // Step 9: Test exact matching if possible
  if (allChannels.data.length > 0) {
    const exactChannel = allChannels.data[0];

    const exactSearch = await api.functional.shoppingMall.channels.index(
      connection,
      {
        body: {
          search: exactChannel.name,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallChannel.IRequest,
      },
    );
    typia.assert(exactSearch);

    TestValidator.predicate(
      "exact name search should find the channel",
      exactSearch.data.some((channel) => channel.id === exactChannel.id),
    );
  }

  // Step 10: Test sorting with search
  const sortedSearch = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        search:
          allChannels.data.length > 0
            ? RandomGenerator.pick(allChannels.data).name.substring(0, 3)
            : "",
        sortBy: "name",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(sortedSearch);

  // Verify sorted order
  if (sortedSearch.data.length > 1) {
    const names = sortedSearch.data.map((c) => c.name);
    const sortedNames = [...names].sort();
    TestValidator.equals(
      "search results should be sorted by name ascending",
      names,
      sortedNames,
    );
  }
}
