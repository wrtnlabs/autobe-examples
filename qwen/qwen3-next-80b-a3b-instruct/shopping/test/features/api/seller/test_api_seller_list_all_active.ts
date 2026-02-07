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

export async function test_api_seller_list_all_active(
  connection: api.IConnection,
): Promise<void> {
  // Call the API endpoint as specified
  const response = await api.functional.shoppingMall.sellers.index(connection);
  typia.assert(response);
  // Validate that data array contains at least one seller
  TestValidator.predicate(
    "at least one seller record",
    response.data.length >= 1,
  );
  // Validate pagination properties
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "records count is at least 1",
    response.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages count is at least 1",
    response.pagination.pages >= 1,
  );
}
