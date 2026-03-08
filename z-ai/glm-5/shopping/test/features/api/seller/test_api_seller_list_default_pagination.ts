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

export async function test_api_seller_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Call seller list endpoint with default parameters (empty request body)
  const response = await api.functional.shoppingMall.sellers.index(connection, {
    body: {} satisfies IShoppingMallSeller.IRequest,
  });
  // Validate response structure - typia.assert performs complete validation
  typia.assert(response);
  // Validate default sort order is created_at descending (newest first)
  // This is business logic validation, not type checking
  if (response.data.length > 1) {
    const dates = response.data.map((s) => new Date(s.created_at).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      TestValidator.predicate(
        "created_at descending order",
        dates[i] >= dates[i + 1],
      );
    }
  }
}
