import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_search_with_text_only_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // IRequest is an empty object {} as defined in DTO.
  // We must use an empty body since no properties are allowed.
  const searchBody = {} satisfies IShoppingMallProduct.IRequest;
  // Execute product search with empty body (no search criteria or pagination possible)
  const result = await api.functional.shoppingMall.products.index(
    customerConnection,
    {
      body: searchBody,
    },
  );
  typia.assert(result);
  // Validate response structure - only what is possible with empty IRequest
  TestValidator.predicate("pagination exists", result.pagination !== null);
  TestValidator.predicate(
    "pagination current is positive",
    result.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  TestValidator.predicate("data array has some items", result.data.length > 0);
  TestValidator.predicate(
    "each data item has a non-null property",
    result.data.every((item) => Object.keys(item).length > 0)
  );
}