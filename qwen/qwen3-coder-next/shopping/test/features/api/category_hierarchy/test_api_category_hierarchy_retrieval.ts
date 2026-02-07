import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_hierarchy_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Execute the category hierarchy retrieval API call
  const categoryHierarchy =
    await api.functional.shoppingMall.categories.hierarchy(connection);
  // Validate the response structure using typia
  typia.assert(categoryHierarchy);
}
