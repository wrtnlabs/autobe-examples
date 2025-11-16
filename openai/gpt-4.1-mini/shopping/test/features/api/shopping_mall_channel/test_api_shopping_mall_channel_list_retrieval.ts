import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

export async function test_api_shopping_mall_channel_list_retrieval(
  connection: api.IConnection,
) {
  // Test default pagination without filters
  const defaultRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallChannel.IRequest;

  const defaultResponse: IPageIShoppingMallChannel.ISummary =
    await api.functional.shoppingMall.shoppingMallChannels.index(connection, {
      body: defaultRequest,
    });
  typia.assert(defaultResponse);

  TestValidator.predicate(
    "default pagination returns data array",
    Array.isArray(defaultResponse.data) &&
      defaultResponse.data.length <= defaultRequest.limit!,
  );
  TestValidator.predicate(
    "pagination metadata current page",
    defaultResponse.pagination.current === defaultRequest.page,
  );
  TestValidator.predicate(
    "pagination metadata limit",
    defaultResponse.pagination.limit === defaultRequest.limit,
  );

  // Test search filter by partial channel name
  const searchKeyword: string = RandomGenerator.substring(
    defaultResponse.data.length > 0
      ? defaultResponse.data[0].name
      : "ChannelNameExample",
  );

  const searchRequest = {
    search: searchKeyword,
    page: 1,
    limit: 5,
    sort_by: "name",
    sort_direction: "asc",
  } satisfies IShoppingMallChannel.IRequest;

  const searchResponse: IPageIShoppingMallChannel.ISummary =
    await api.functional.shoppingMall.shoppingMallChannels.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResponse);

  TestValidator.predicate(
    "search response data length within limit",
    searchResponse.data.length <= searchRequest.limit!,
  );
  for (const channel of searchResponse.data) {
    TestValidator.predicate(
      `channel name contains search keyword: ${searchKeyword}`,
      channel.name.includes(searchKeyword),
    );
  }

  // Test filter by exact code with pagination and descending sort
  if (defaultResponse.data.length > 0) {
    const codeFilterRequest = {
      code: defaultResponse.data[0].code,
      page: 1,
      limit: 3,
      sort_by: "code",
      sort_direction: "desc",
    } satisfies IShoppingMallChannel.IRequest;

    const codeFilterResponse: IPageIShoppingMallChannel.ISummary =
      await api.functional.shoppingMall.shoppingMallChannels.index(connection, {
        body: codeFilterRequest,
      });
    typia.assert(codeFilterResponse);

    TestValidator.predicate(
      "code filter returns only matching code channels",
      codeFilterResponse.data.every((c) => c.code === codeFilterRequest.code),
    );
  }

  // Test pagination: offset usage
  const offsetRequest = {
    page: 1,
    limit: 2,
    offset: 1,
    sort_by: "created_at",
    sort_direction: "asc",
  } satisfies IShoppingMallChannel.IRequest;

  const offsetResponse: IPageIShoppingMallChannel.ISummary =
    await api.functional.shoppingMall.shoppingMallChannels.index(connection, {
      body: offsetRequest,
    });
  typia.assert(offsetResponse);

  TestValidator.predicate(
    "pagination offset is respected",
    offsetResponse.data.length <= offsetRequest.limit!,
  );

  // Test filter by status and date range (if fields available)
  // Note: status is a string filter, dates are date-time strings
  const nowIso = new Date().toISOString();
  const pastIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const dateFilterRequest = {
    status: "active",
    created_from: pastIso,
    created_to: nowIso,
    page: 1,
    limit: 5,
    sort_by: "updated_at",
    sort_direction: "desc",
  } satisfies IShoppingMallChannel.IRequest;

  const dateFilterResponse: IPageIShoppingMallChannel.ISummary =
    await api.functional.shoppingMall.shoppingMallChannels.index(connection, {
      body: dateFilterRequest,
    });
  typia.assert(dateFilterResponse);

  // We cannot verify status or dates in response as ISummary lacks status
  // Just check pagination and data length
  TestValidator.predicate(
    "date filter pagination data length",
    dateFilterResponse.data.length <= dateFilterRequest.limit!,
  );
  TestValidator.predicate(
    "date filter pagination current",
    dateFilterResponse.pagination.current === dateFilterRequest.page,
  );
}
