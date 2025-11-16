import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannelCategory";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

export async function test_api_shopping_mall_channel_categories_filtered_list(
  connection: api.IConnection,
) {
  // Select a valid channelCode string (non-empty, allowed format) for tests
  const channelCode = "testChannel123";

  // Scenario 1: Default pagination without search or sort
  const defaultRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallChannelCategory.IRequest;

  const defaultResponse =
    await api.functional.shoppingMall.shoppingMallChannels.shoppingMallChannelCategories.index(
      connection,
      { channelCode, body: defaultRequest },
    );
  typia.assert(defaultResponse);

  TestValidator.equals(
    "Default pagination: current page matches request",
    defaultResponse.pagination.current,
    defaultRequest.page,
  );
  TestValidator.equals(
    "Default pagination: limit matches request",
    defaultResponse.pagination.limit,
    defaultRequest.limit,
  );

  // If data present, pick substring from a code for search testing
  if (defaultResponse.data.length > 0) {
    const codeSearchTerm = defaultResponse.data[0].code.slice(0, 3);

    // Scenario 2: Search by partial code match
    const searchByCodeRequest = {
      search: codeSearchTerm,
      page: 1,
      limit: 5,
      orderBy: "code",
      orderDirection: "asc",
    } satisfies IShoppingMallChannelCategory.IRequest;

    const searchByCodeResponse =
      await api.functional.shoppingMall.shoppingMallChannels.shoppingMallChannelCategories.index(
        connection,
        { channelCode, body: searchByCodeRequest },
      );
    typia.assert(searchByCodeResponse);

    TestValidator.predicate(
      `Search by code '${codeSearchTerm}': all codes include search term`,
      searchByCodeResponse.data.every((v) => v.code.includes(codeSearchTerm)),
    );

    TestValidator.equals(
      "Search by code: current page matches request",
      searchByCodeResponse.pagination.current,
      searchByCodeRequest.page,
    );

    TestValidator.equals(
      "Search by code: limit matches request",
      searchByCodeResponse.pagination.limit,
      searchByCodeRequest.limit,
    );

    // Scenario 3: Search by partial name match
    const nameSearchTerm = defaultResponse.data[0].name.slice(0, 3);

    const searchByNameRequest = {
      search: nameSearchTerm,
      page: 1,
      limit: 5,
      orderBy: "name",
      orderDirection: "desc",
    } satisfies IShoppingMallChannelCategory.IRequest;

    const searchByNameResponse =
      await api.functional.shoppingMall.shoppingMallChannels.shoppingMallChannelCategories.index(
        connection,
        { channelCode, body: searchByNameRequest },
      );
    typia.assert(searchByNameResponse);

    TestValidator.predicate(
      `Search by name '${nameSearchTerm}': all names include search term`,
      searchByNameResponse.data.every((v) => v.name.includes(nameSearchTerm)),
    );

    TestValidator.equals(
      "Search by name: current page matches request",
      searchByNameResponse.pagination.current,
      searchByNameRequest.page,
    );

    TestValidator.equals(
      "Search by name: limit matches request",
      searchByNameResponse.pagination.limit,
      searchByNameRequest.limit,
    );

    // Scenario 4: Request a page beyond last page, expect empty data
    const beyondLastPageRequest = {
      page: searchByCodeResponse.pagination.pages + 1,
      limit: 5,
    } satisfies IShoppingMallChannelCategory.IRequest;

    const beyondLastPageResponse =
      await api.functional.shoppingMall.shoppingMallChannels.shoppingMallChannelCategories.index(
        connection,
        { channelCode, body: beyondLastPageRequest },
      );
    typia.assert(beyondLastPageResponse);

    TestValidator.predicate(
      "Beyond last page: data array is empty",
      beyondLastPageResponse.data.length === 0,
    );

    TestValidator.equals(
      "Beyond last page: current page matches request",
      beyondLastPageResponse.pagination.current,
      beyondLastPageRequest.page,
    );

    TestValidator.equals(
      "Beyond last page: limit matches request",
      beyondLastPageResponse.pagination.limit,
      beyondLastPageRequest.limit,
    );

    // Scenario 5: Sort ascending by code
    const sortAscCodeRequest = {
      page: 1,
      limit: 10,
      orderBy: "code",
      orderDirection: "asc",
    } satisfies IShoppingMallChannelCategory.IRequest;

    const sortAscCodeResponse =
      await api.functional.shoppingMall.shoppingMallChannels.shoppingMallChannelCategories.index(
        connection,
        { channelCode, body: sortAscCodeRequest },
      );
    typia.assert(sortAscCodeResponse);

    TestValidator.predicate(
      "Sort ascending by code: items sorted correctly",
      sortAscCodeResponse.data.every(
        (v, i, a) => i === 0 || a[i - 1].code <= v.code,
      ),
    );

    // Scenario 6: Sort descending by name
    const sortDescNameRequest = {
      page: 1,
      limit: 10,
      orderBy: "name",
      orderDirection: "desc",
    } satisfies IShoppingMallChannelCategory.IRequest;

    const sortDescNameResponse =
      await api.functional.shoppingMall.shoppingMallChannels.shoppingMallChannelCategories.index(
        connection,
        { channelCode, body: sortDescNameRequest },
      );
    typia.assert(sortDescNameResponse);

    TestValidator.predicate(
      "Sort descending by name: items sorted correctly",
      sortDescNameResponse.data.every(
        (v, i, a) => i === 0 || a[i - 1].name >= v.name,
      ),
    );
  }
}
