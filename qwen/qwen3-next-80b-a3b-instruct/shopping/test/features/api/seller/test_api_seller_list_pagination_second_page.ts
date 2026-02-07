import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_list_pagination_second_page(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection as required by Connection Isolation Pattern
  const testConnection: api.IConnection = { host: connection.host };
  // First, get the first page with limit=1
  const firstPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.sellers.index(testConnection);
  typia.assert(firstPage);
  // Validate pagination metadata for first page
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 1);
  // Validate that there are enough sellers for the test (at least 2)
  const totalSellers = firstPage.pagination.records;
  TestValidator.predicate(
    "at least 2 sellers exist for pagination test",
    totalSellers >= 2,
  );
  // Validate that first page has one item
  TestValidator.equals("first page has one item", firstPage.data.length, 1);
  // Request the second page with limit=1
  const secondPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.sellers.index(testConnection);
  typia.assert(secondPage);
  // Validate pagination metadata for second page
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 1);
  // Validate that the second page has exactly one record (since total >= 2 and limit=1)
  TestValidator.equals(
    "second page has exactly one item",
    secondPage.data.length,
    1,
  );
  // Validate total pages calculation: pages = ceil(records / limit)
  const limit = secondPage.pagination.limit;
  const expectedPages = Math.ceil(totalSellers / limit);
  TestValidator.equals(
    "total pages calculation",
    secondPage.pagination.pages,
    expectedPages,
  );
  // Validate that records count is consistent across pages
  TestValidator.equals(
    "total records preserved",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
}
