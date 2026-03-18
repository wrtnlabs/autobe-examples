import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_browse_keyword_search(
  connection: api.IConnection,
): Promise<void> {
  const browseConnection: api.IConnection = { host: connection.host };
  const keyword = RandomGenerator.alphabets(12);
  const response = await api.functional.shoppingMall.categories.index(
    browseConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: keyword,
        parent_id: null,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "pagination metadata should be non-negative",
    response.pagination.current >= 0 &&
      response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data should contain at most the requested page size",
    response.data.length <= 10,
  );
  TestValidator.predicate(
    "returned categories should be active",
    response.data.every((category) => category.deleted_at === null),
  );
  const emptyKeyword = `no_match_${RandomGenerator.alphabets(12)}`;
  const emptyResponse = await api.functional.shoppingMall.categories.index(
    browseConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: emptyKeyword,
        parent_id: null,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty search should return no categories",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty search record count should be zero",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search page count should be zero",
    emptyResponse.pagination.pages,
    0,
  );
}
