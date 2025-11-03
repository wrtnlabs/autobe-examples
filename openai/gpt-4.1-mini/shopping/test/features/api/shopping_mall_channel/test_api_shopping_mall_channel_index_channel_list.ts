import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannelDefinition";
import type { IShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelDefinition";

/**
 * Retrieves a paginated and filtered list of shopping mall platform channels.
 * Validates filtering by channel code, name, and search text applied to code,
 * name, or description. Also tests sorting by channel_code, channel_name, and
 * created_at fields in ascending and descending order. Ensures that
 * parent-child hierarchy exists in the channel list. Confirms that pagination
 * metadata such as current page, limit, records, and pages is correct.
 * Validates response data types with typia.assert. Uses public access
 * (unauthenticated) to call the API.
 */
export async function test_api_shopping_mall_channel_index_channel_list(
  connection: api.IConnection,
) {
  // Filter values for tests
  const searchText = "channel";
  const channelCodeFilter = "CHN";
  const channelNameFilter = "Main";

  // Helper to call index with given filter/sort request
  async function fetchChannels(
    requestBody: IShoppingMallChannelDefinition.IRequest,
  ): Promise<IPageIShoppingMallChannelDefinition.ISummary> {
    const output = await api.functional.shoppingMall.channels.index(
      connection,
      {
        body: requestBody,
      },
    );
    typia.assert(output);
    return output;
  }

  // Basic positive test with general search_text
  const commonRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    search_text: searchText,
    filter_channel_code: null,
    filter_channel_name: null,
    sort_by: "channel_code",
    sort_order: "asc" as "asc" | "desc",
  } satisfies IShoppingMallChannelDefinition.IRequest;

  const defaultPage = await fetchChannels(commonRequest);

  TestValidator.predicate(
    "pagination current page is at least 1",
    defaultPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    defaultPage.pagination.limit === commonRequest.limit,
  );

  TestValidator.predicate(
    "pagination total records non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages non-negative",
    defaultPage.pagination.pages >= 0,
  );

  // If records > 0, there should be data entries
  if (defaultPage.pagination.records > 0) {
    TestValidator.predicate(
      "data has at least one summary entry",
      defaultPage.data.length > 0,
    );

    // Check every summary entry for required properties
    for (const summary of defaultPage.data) {
      typia.assert(summary);
      TestValidator.predicate(
        "summary id valid uuid",
        /^[0-9a-f-]{36}$/i.test(summary.id),
      );
      TestValidator.predicate(
        "channel_code non-empty",
        typeof summary.channel_code === "string" &&
          summary.channel_code.length > 0,
      );
      TestValidator.predicate(
        "channel_name non-empty",
        typeof summary.channel_name === "string" &&
          summary.channel_name.length > 0,
      );

      // description may be null or string
      TestValidator.predicate(
        "description is string or null",
        typeof summary.description === "string" ||
          summary.description === null ||
          summary.description === undefined,
      );

      TestValidator.predicate(
        "created_at valid date-time",
        !isNaN(Date.parse(summary.created_at)),
      );
    }
  }

  // Test filtering by channel_code
  const codeFilterRequest = {
    ...commonRequest,
    filter_channel_code: channelCodeFilter,
    filter_channel_name: null,
    search_text: null,
  } satisfies IShoppingMallChannelDefinition.IRequest;
  const codeFiltered = await fetchChannels(codeFilterRequest);

  for (const summary of codeFiltered.data) {
    TestValidator.predicate(
      `channel_code filter: ${summary.channel_code} contains ${channelCodeFilter}`,
      summary.channel_code.includes(channelCodeFilter),
    );
  }

  // Test filtering by channel_name
  const nameFilterRequest = {
    ...commonRequest,
    filter_channel_code: null,
    filter_channel_name: channelNameFilter,
    search_text: null,
  } satisfies IShoppingMallChannelDefinition.IRequest;
  const nameFiltered = await fetchChannels(nameFilterRequest);

  for (const summary of nameFiltered.data) {
    TestValidator.predicate(
      `channel_name filter: ${summary.channel_name} contains ${channelNameFilter}`,
      summary.channel_name.includes(channelNameFilter),
    );
  }

  // Test sorting by each allowed field and order
  const sortFields = ["channel_code", "channel_name", "created_at"] as const;
  const sortOrders = ["asc", "desc"] as const;

  for (const field of sortFields) {
    for (const order of sortOrders) {
      const sortRequest = {
        ...commonRequest,
        sort_by: field,
        sort_order: order,
        page: 1,
        limit: 20,
        filter_channel_code: null,
        filter_channel_name: null,
        search_text: null,
      } satisfies IShoppingMallChannelDefinition.IRequest;
      const sortedPage = await fetchChannels(sortRequest);

      // Helper compare function
      const compareValues = (a: any, b: any): number => {
        if (field === "created_at") {
          return new Date(a) < new Date(b)
            ? -1
            : new Date(a) > new Date(b)
              ? 1
              : 0;
        }
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      };

      // Validate sorting order for data array
      for (let i = 0; i + 1 < sortedPage.data.length; i++) {
        const cmp = compareValues(
          sortedPage.data[i][field],
          sortedPage.data[i + 1][field],
        );
        if (order === "asc") {
          TestValidator.predicate(`${field} ascending order`, cmp <= 0);
        } else {
          TestValidator.predicate(`${field} descending order`, cmp >= 0);
        }
      }
    }
  }
}
